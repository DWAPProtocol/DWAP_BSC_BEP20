/**
 * Re-verify DWAP Governor only
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config();

const API_KEY = process.env.BSCSCAN_API_KEY;
const CHAIN_ID = 97;
const API_URL = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}`;

const GOVERNOR_ADDRESS = "0x489129155846d62f23339E0c74ea2533205Ad9Cf";
const TOKEN_ADDRESS    = "0x6438357D1A36537b864F6734e072661Cf8796759";
const TIMELOCK_ADDRESS = "0x751E65B6A30ed777B646dD74860db214A87060B2";
const PROPOSAL_FEE     = BigInt("1000000000000000000000"); // 1000e18

function getBuildInfo() {
  const buildInfoDir = path.join(__dirname, "..", "artifacts", "build-info");
  const files = fs.readdirSync(buildInfoDir);
  if (files.length === 0) throw new Error("No build info found.");
  const latestFile = files
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(buildInfoDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;
  console.log(`Using build-info: ${latestFile}`);
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
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const result = await httpGet(url);
    console.log(`  Status check ${i + 1}: ${result.result || result.message}`);
    if (result.result && !result.result.includes("Pending")) return result;
  }
  return { result: "Timeout" };
}

async function main() {
  console.log("Re-verifying DWAP Governor...");
  console.log(`Address: ${GOVERNOR_ADDRESS}\n`);

  const buildInfo = getBuildInfo();
  const { ethers } = require("ethers");

  const governorArgs = ethers.AbiCoder.defaultAbiCoder()
    .encode(
      ["address", "address", "uint256"],
      [TOKEN_ADDRESS, TIMELOCK_ADDRESS, PROPOSAL_FEE]
    )
    .slice(2);

  console.log(`Constructor args: ${governorArgs.substring(0, 60)}...`);

  const data = {
    apikey: API_KEY,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: GOVERNOR_ADDRESS,
    sourceCode: JSON.stringify({
      language: "Solidity",
      sources: buildInfo.input.sources,
      settings: buildInfo.input.settings,
    }),
    codeformat: "solidity-standard-json-input",
    contractname: "contracts/DWAP_Governor.sol:DWAP_Governor",
    compilerversion: `v${buildInfo.solcLongVersion}`,
    constructorArguements: governorArgs,
  };

  console.log(`Compiler: v${buildInfo.solcLongVersion}`);
  console.log("Submitting...");

  const response = await httpPost(API_URL, data);
  console.log(`Response: ${JSON.stringify(response)}`);

  if (response.status === "1") {
    const status = await checkStatus(response.result);
    if (status.result && status.result.includes("Pass")) {
      console.log("\n✅ DWAP Governor verified successfully!");
    } else if (status.result && status.result.includes("Already")) {
      console.log("\n✅ Already verified!");
    } else {
      console.log(`\n❌ Failed: ${status.result}`);
    }
  } else {
    console.log(`❌ Submission failed: ${response.result || response.message}`);
  }
}

main().catch(console.error);
