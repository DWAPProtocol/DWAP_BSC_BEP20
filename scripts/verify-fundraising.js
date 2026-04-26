/**
 * verify-fundraising.js
 * ─────────────────────
 * Verifies DWAP fundraising contracts on BscScan via Etherscan V2 API.
 * Reads addresses from the most recent deployment-fundraising-*.json file.
 */
const fs    = require("fs");
const path  = require("path");
const https = require("https");
require("dotenv").config();

const API_KEY  = process.env.BSCSCAN_API_KEY;
const CHAIN_ID = 97; // BSC Testnet
const API_URL  = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}`;

// ─────────────────────────────────────────────────────────────────────────────

function loadFundraisingDeployment() {
  const files = fs.readdirSync(".")
    .filter(f => f.startsWith("deployment-fundraising-") && f.endsWith(".json"))
    .map(f => ({ name: f, mtime: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new Error("No fundraising deployment JSON found. Run deploy-fundraising.js first.");
  }
  console.log(`Using deployment file: ${files[0].name}`);
  return JSON.parse(fs.readFileSync(files[0].name, "utf8"));
}

function getBuildInfo() {
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(buildInfoDir);
  if (files.length === 0) throw new Error("No build info. Run: hardhat compile");
  const latest = files
    .map(f => ({ name: f, mtime: fs.statSync(path.join(buildInfoDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;
  return JSON.parse(fs.readFileSync(path.join(buildInfoDir, latest), "utf8"));
}

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(data).toString();
    const urlObj   = new URL(url);
    const options  = {
      hostname: urlObj.hostname,
      path    : urlObj.pathname + urlObj.search,
      method  : "POST",
      headers : {
        "Content-Type"  : "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => (body += chunk));
      res.on("end",  ()    => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
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
      res.on("data", chunk => (body += chunk));
      res.on("end",  ()    => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    }).on("error", reject);
  });
}

async function checkStatus(guid) {
  const url = `${API_URL}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${API_KEY}`;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const result = await httpGet(url);
    console.log(`  Status check ${i + 1}: ${result.result || result.message}`);
    if (result.result && !result.result.includes("Pending")) return result;
  }
  return { result: "Timeout" };
}

async function verifyContract(name, address, contractPath, constructorArgs) {
  console.log(`\n${"=".repeat(55)}`);
  console.log(`Verifying : ${name}`);
  console.log(`Address   : ${address}`);
  console.log(`${"=".repeat(55)}`);

  const buildInfo = getBuildInfo();

  const data = {
    apikey           : API_KEY,
    module           : "contract",
    action           : "verifysourcecode",
    contractaddress  : address,
    sourceCode       : JSON.stringify({
      language: "Solidity",
      sources : buildInfo.input.sources,
      settings: buildInfo.input.settings,
    }),
    codeformat       : "solidity-standard-json-input",
    contractname     : contractPath,
    compilerversion  : `v${buildInfo.solcLongVersion}`,
    constructorArguements: constructorArgs || "",
  };

  console.log(`  Compiler : v${buildInfo.solcLongVersion}`);
  console.log(`  Contract : ${contractPath}`);
  console.log("  Submitting...");

  try {
    const response = await httpPost(API_URL, data);
    console.log(`  Response : ${JSON.stringify(response)}`);

    if (response.result && response.result.includes("Already Verified")) {
      console.log(`  ✅ ${name} already verified.`);
      return true;
    }
    if (response.status === "1" && response.result) {
      const status = await checkStatus(response.result);
      if (status.result && (status.result.includes("Pass") || status.result.includes("Already"))) {
        console.log(`  ✅ ${name} verified!`);
        return true;
      }
      console.log(`  ❌ ${name}: ${status.result}`);
      return false;
    }
    console.log(`  ❌ Submission failed: ${response.result || response.message}`);
    return false;
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("DWAP Fundraising — Contract Verification");
  console.log(`Chain ID : ${CHAIN_ID} (BSC Testnet)`);
  console.log(`API Key  : ${API_KEY ? API_KEY.slice(0, 6) + "..." : "MISSING"}\n`);

  if (!API_KEY) {
    console.error("ERROR: BSCSCAN_API_KEY not set in .env");
    process.exit(1);
  }

  const dep = loadFundraisingDeployment();
  const { ethers } = require("ethers");

  const tokenAddr    = dep.coreAddresses.dwapToken;
  const timelockAddr = dep.coreAddresses.dwapTimelock;
  const deployer     = dep.deployer;

  const { vestingFactory, privateSale, publicSale } = dep.fundraisingAddresses;

  // ── 1. DWAP_VestingFactory ─────────────────────────────────────────────────
  // constructor(address _token, address _owner)
  const factoryArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(["address", "address"], [tokenAddr, deployer])
    .slice(2);
  await verifyContract(
    "DWAP_VestingFactory",
    vestingFactory,
    "contracts/fundraising/DWAP_VestingFactory.sol:DWAP_VestingFactory",
    factoryArgs
  );

  // ── 2. DWAP_PrivateSale ────────────────────────────────────────────────────
  // constructor(address,uint256,uint256,uint256,uint256,uint256,uint64,uint64,address,address)
  const PRIVATE_TOKENS_PER_BNB   = ethers.parseEther("100000");
  const PRIVATE_HARD_CAP         = ethers.parseEther("1000");
  const PRIVATE_SOFT_CAP         = ethers.parseEther("100");
  const PRIVATE_MIN_CONTRIBUTION = ethers.parseEther("0.1");
  const PRIVATE_MAX_CONTRIBUTION = ethers.parseEther("20");
  const PRIVATE_VESTING_CLIFF    = BigInt(90  * 24 * 60 * 60);
  const PRIVATE_VESTING_DURATION = BigInt(365 * 24 * 60 * 60);

  const privateSaleArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(
      ["address","uint256","uint256","uint256","uint256","uint256","uint64","uint64","address","address"],
      [
        tokenAddr,
        PRIVATE_TOKENS_PER_BNB,
        PRIVATE_HARD_CAP,
        PRIVATE_SOFT_CAP,
        PRIVATE_MIN_CONTRIBUTION,
        PRIVATE_MAX_CONTRIBUTION,
        PRIVATE_VESTING_CLIFF,
        PRIVATE_VESTING_DURATION,
        timelockAddr,
        deployer,
      ]
    )
    .slice(2);
  await verifyContract(
    "DWAP_PrivateSale",
    privateSale,
    "contracts/fundraising/DWAP_PrivateSale.sol:DWAP_PrivateSale",
    privateSaleArgs
  );

  // ── 3. DWAP_PublicSale ─────────────────────────────────────────────────────
  // constructor(address,uint256,uint256,uint256,uint256,uint256,uint64,address,address)
  const PUBLIC_TOKENS_PER_BNB    = ethers.parseEther("50000");
  const PUBLIC_HARD_CAP          = ethers.parseEther("1500");
  const PUBLIC_SOFT_CAP          = ethers.parseEther("150");
  const PUBLIC_MIN_CONTRIBUTION  = ethers.parseEther("0.05");
  const PUBLIC_MAX_CONTRIBUTION  = ethers.parseEther("5");
  const PUBLIC_LOCKUP_DURATION   = BigInt(30 * 24 * 60 * 60);

  const publicSaleArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(
      ["address","uint256","uint256","uint256","uint256","uint256","uint64","address","address"],
      [
        tokenAddr,
        PUBLIC_TOKENS_PER_BNB,
        PUBLIC_HARD_CAP,
        PUBLIC_SOFT_CAP,
        PUBLIC_MIN_CONTRIBUTION,
        PUBLIC_MAX_CONTRIBUTION,
        PUBLIC_LOCKUP_DURATION,
        timelockAddr,
        deployer,
      ]
    )
    .slice(2);
  await verifyContract(
    "DWAP_PublicSale",
    publicSale,
    "contracts/fundraising/DWAP_PublicSale.sol:DWAP_PublicSale",
    publicSaleArgs
  );

  // ── 4. DWAP_Vesting (implementation — verify one as representative) ────────
  // Each vesting vault has unique args; verify one so BscScan can match bytecode.
  if (dep.vestingVaults && dep.vestingVaults.length > 0) {
    const exampleVestingAddr = dep.vestingVaults[0];
    // Example: Team Slot 1 — 75M, 4yr, 1yr cliff, revocable, owner = deployer
    const TEAM_ALLOCATION = ethers.parseEther("75000000");
    const vestingStart    = BigInt(Math.floor(new Date(dep.timestamp).getTime() / 1000));
    const TEAM_CLIFF      = BigInt(365 * 24 * 60 * 60);
    const TEAM_DURATION   = BigInt(4 * 365 * 24 * 60 * 60);

    const vestingArgs = ethers.AbiCoder.defaultAbiCoder()
      .encode(
        ["address","address","uint256","uint64","uint64","uint64","bool","address"],
        [
          tokenAddr,
          deployer,
          TEAM_ALLOCATION,
          vestingStart,
          TEAM_CLIFF,
          TEAM_DURATION,
          true,
          deployer,
        ]
      )
      .slice(2);
    await verifyContract(
      "DWAP_Vesting (team slot 1)",
      exampleVestingAddr,
      "contracts/fundraising/DWAP_Vesting.sol:DWAP_Vesting",
      vestingArgs
    );
  }

  console.log("\n" + "=".repeat(55));
  console.log("Verification complete.");
  console.log("=".repeat(55) + "\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
