/**
 * Direct Etherscan V2 API verification script
 * Bypasses hardhat-verify and uses the Etherscan V2 API directly
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config();

const API_KEY = process.env.BSCSCAN_API_KEY;
const CHAIN_ID = 97; // BSC Testnet
const API_URL = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}`;

const ADDRESSES = {
  tokenImpl: "0xf768572Dd3de8C1bB1983dBa268EE4C85829c4D1",
  tokenProxy: "0x3348433174d453D15436E9cE0A5124DdBd07Fb6E",
  timelock: "0xec6d0EdF408Db655D884d4bb1027177f8Ad5fD90",
  governor: "0x1124dF8A1C27B9B4265b3293E61B36d0fEFd4F98",
  burnControllerImpl: "0x286F157393092e7BFdd51934721d9E624024E5D8",
  burnControllerProxy: "0x760c11c054273D400B1CdbD9146095b8BEE197F8",
};

// Read build info from hardhat artifacts
function getBuildInfo() {
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(buildInfoDir);
  if (files.length === 0) throw new Error("No build info found. Run hardhat compile first.");
  // Use the latest build info
  const latestFile = files[files.length - 1];
  return JSON.parse(fs.readFileSync(path.join(buildInfoDir, latestFile), "utf8"));
}

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(data).toString();
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    }).on("error", reject);
  });
}

async function checkStatus(guid) {
  const url = `${API_URL}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${API_KEY}`;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const result = await httpGet(url);
    console.log(`  Status check ${i + 1}: ${result.result || result.message}`);
    if (result.result && !result.result.includes("Pending")) {
      return result;
    }
  }
  return { result: "Timeout waiting for verification" };
}

async function verifyContract(name, address, contractPath, constructorArgs) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Verifying: ${name}`);
  console.log(`Address: ${address}`);
  console.log(`${"=".repeat(50)}`);

  const buildInfo = getBuildInfo();

  const data = {
    apikey: API_KEY,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: address,
    sourceCode: JSON.stringify({
      language: "Solidity",
      sources: buildInfo.input.sources,
      settings: buildInfo.input.settings,
    }),
    codeformat: "solidity-standard-json-input",
    contractname: contractPath,
    compilerversion: `v${buildInfo.solcLongVersion}`,
    constructorArguements: constructorArgs || "",
  };

  console.log(`  Compiler: v${buildInfo.solcLongVersion}`);
  console.log(`  Contract: ${contractPath}`);
  console.log("  Submitting to Etherscan V2 API...");

  try {
    const response = await httpPost(API_URL, data);
    console.log(`  Response: ${JSON.stringify(response)}`);
    
    if (response.status === "1" && response.result) {
      console.log(`  GUID: ${response.result}`);
      const status = await checkStatus(response.result);
      if (status.result && status.result.includes("Pass")) {
        console.log(`  ✅ ${name} verified successfully!`);
        return true;
      } else if (status.result && status.result.includes("Already Verified")) {
        console.log(`  ✅ ${name} already verified.`);
        return true;
      } else {
        console.log(`  ❌ ${name}: ${status.result}`);
        return false;
      }
    } else {
      if (response.result && response.result.includes("Already Verified")) {
        console.log(`  ✅ ${name} already verified.`);
        return true;
      }
      console.log(`  ❌ Submission failed: ${response.result || response.message}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("DWAP Contract Verification - Etherscan V2 API");
  console.log(`Chain ID: ${CHAIN_ID} (BSC Testnet)`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 6) + "..." : "MISSING"}\n`);

  if (!API_KEY) {
    console.error("ERROR: BSCSCAN_API_KEY not set in .env");
    process.exit(1);
  }

  // Encode constructor arguments
  const { ethers } = require("ethers");

  // Token Implementation - no constructor args
  await verifyContract(
    "DWAP Token Implementation",
    ADDRESSES.tokenImpl,
    "contracts/DWAP_Token.sol:DWAP_Token",
    ""
  );

  // Token Proxy - constructor(address implementation, bytes data)
  const tokenAbi = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "artifacts", "contracts", "DWAP_Token.sol", "DWAP_Token.json"),
      "utf8"
    )
  ).abi;
  const tokenIface = new ethers.Interface(tokenAbi);
  const tokenInitData = tokenIface.encodeFunctionData("initialize", [
    "0x4D28DE16E06FBc99EF5405aa0354B6453BA25447",
  ]);
  const tokenProxyArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(["address", "bytes"], [ADDRESSES.tokenImpl, tokenInitData])
    .slice(2);
  await verifyContract(
    "DWAP Token Proxy",
    ADDRESSES.tokenProxy,
    "contracts/Proxies.sol:DWAP_TokenProxy",
    tokenProxyArgs
  );

  // Timelock - constructor(uint256 minDelay, address[] proposers, address[] executors, address admin)
  const timelockArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(
      ["uint256", "address[]", "address[]", "address"],
      [172800, [], ["0x4D28DE16E06FBc99EF5405aa0354B6453BA25447"], "0x4D28DE16E06FBc99EF5405aa0354B6453BA25447"]
    )
    .slice(2);
  await verifyContract(
    "DWAP Timelock",
    ADDRESSES.timelock,
    "contracts/DWAP_Timelock.sol:DWAP_Timelock",
    timelockArgs
  );

  // Governor - constructor(IVotes token, TimelockController timelock)
  const governorArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(["address", "address"], [ADDRESSES.tokenProxy, ADDRESSES.timelock])
    .slice(2);
  await verifyContract(
    "DWAP Governor",
    ADDRESSES.governor,
    "contracts/DWAP_Governor.sol:DWAP_Governor",
    governorArgs
  );

  // BurnController Implementation - no constructor args
  await verifyContract(
    "DWAP Burn Controller Implementation",
    ADDRESSES.burnControllerImpl,
    "contracts/DWAP_BurnController.sol:DWAP_BurnController",
    ""
  );

  // BurnController Proxy - constructor(address implementation, bytes data)
  const burnAbi = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "artifacts", "contracts", "DWAP_BurnController.sol", "DWAP_BurnController.json"),
      "utf8"
    )
  ).abi;
  const burnIface = new ethers.Interface(burnAbi);
  const burnInitData = burnIface.encodeFunctionData("initialize", [
    ADDRESSES.tokenProxy,
    "0x4D28DE16E06FBc99EF5405aa0354B6453BA25447",
    0,
  ]);
  const burnProxyArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(["address", "bytes"], [ADDRESSES.burnControllerImpl, burnInitData])
    .slice(2);
  await verifyContract(
    "DWAP Burn Controller Proxy",
    ADDRESSES.burnControllerProxy,
    "contracts/Proxies.sol:DWAP_BurnControllerProxy",
    burnProxyArgs
  );

  console.log("\n" + "=".repeat(50));
  console.log("Verification process complete!");
  console.log("=".repeat(50));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
