/**
 * deploy-fundraising.js
 * ─────────────────────
 * Deploys the DWAP Protocol fundraising layer:
 *   • DWAP_VestingFactory   — team & advisor allocations
 *   • DWAP_PrivateSale      — Merkle-whitelisted seed round
 *   • DWAP_PublicSale       — open public IDO
 *
 * Pre-requisites:
 *   • Core contracts already deployed (DWAP_Token, DWAP_Timelock, etc.)
 *   • Latest deployment JSON present in project root
 *   • Deployer wallet holds all 1B DWAP tokens
 *
 * Token Allocation  (1,000,000,000 DWAP = 100%)
 * ┌─────────────────────────────┬────────────────┬───────┐
 * │ Bucket                      │ Amount (DWAP)  │   %   │
 * ├─────────────────────────────┼────────────────┼───────┤
 * │ Team (VestingFactory)       │  150,000,000   │ 15.0% │
 * │ Advisors / Strategic        │  100,000,000   │ 10.0% │
 * │ Community / Airdrop         │  100,000,000   │ 10.0% │
 * │ Ecosystem / Liquidity       │  100,000,000   │ 10.0% │
 * │ Private Sale                │  100,000,000   │ 10.0% │
 * │ Public Sale (IDO)           │   75,000,000   │  7.5% │
 * │ Treasury (DAO)              │  375,000,000   │ 37.5% │
 * └─────────────────────────────┴────────────────┴───────┘
 *
 * Community/Ecosystem allocation sits in Timelock until DAO governance
 * approves distribution via airdrop campaign or liquidity program.
 *
 * After this script runs:
 *   1. Set the real Merkle root: privateSale.setMerkleRoot(root)
 *   2. Start private sale:       privateSale.startSale()
 *   3. After private closes:     privateSale.finalize()
 *   4. Start public sale:        publicSale.startSale()
 *   5. After public closes:      publicSale.finalize()
 */

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

// ── Token Allocation ──────────────────────────────────────────────────────────
const TEAM_ALLOCATION       = hre.ethers.parseEther("150000000"); // 150 M — 1yr cliff, 4yr vest
const ADVISOR_ALLOCATION    = hre.ethers.parseEther("100000000"); // 100 M — 9mo cliff, 18mo vest
const COMMUNITY_ALLOCATION  = hre.ethers.parseEther("100000000"); // 100 M — airdrops & early contributors
const ECOSYSTEM_ALLOCATION  = hre.ethers.parseEther("100000000"); // 100 M — liquidity, grants, integrations
const PRIVATE_SALE_TOKENS   = hre.ethers.parseEther("100000000"); // 100 M
const PUBLIC_SALE_TOKENS    = hre.ethers.parseEther("75000000");  //  75 M
// Treasury (375 M) = remainder transferred to Timelock at the end
// Community + Ecosystem (200 M total) also held by Timelock pending DAO proposals

// ── Private Sale Parameters ───────────────────────────────────────────────────
const PRIVATE_TOKENS_PER_BNB   = hre.ethers.parseEther("100000");  // 100k DWAP/BNB
const PRIVATE_HARD_CAP         = hre.ethers.parseEther("1000");    // 1,000 BNB
const PRIVATE_SOFT_CAP         = hre.ethers.parseEther("100");     //   100 BNB
const PRIVATE_MIN_CONTRIBUTION = hre.ethers.parseEther("0.1");     //  0.1 BNB
const PRIVATE_MAX_CONTRIBUTION = hre.ethers.parseEther("20");      //  20  BNB
const PRIVATE_VESTING_CLIFF    = 90  * 24 * 60 * 60;              //  90 days (s)
const PRIVATE_VESTING_DURATION = 365 * 24 * 60 * 60;              // 365 days (s)

// ── Public Sale Parameters ────────────────────────────────────────────────────
const PUBLIC_TOKENS_PER_BNB    = hre.ethers.parseEther("50000");   // 50k DWAP/BNB
const PUBLIC_HARD_CAP          = hre.ethers.parseEther("1500");    // 1,500 BNB
const PUBLIC_SOFT_CAP          = hre.ethers.parseEther("150");     //   150 BNB
const PUBLIC_MIN_CONTRIBUTION  = hre.ethers.parseEther("0.05");    //  0.05 BNB
const PUBLIC_MAX_CONTRIBUTION  = hre.ethers.parseEther("5");       //    5  BNB
const PUBLIC_LOCKUP_DURATION   = 30 * 24 * 60 * 60;               //  30 days (s)

// ── Vesting Schedules ─────────────────────────────────────────────────────────
const TEAM_CLIFF     = 365 * 24 * 60 * 60;  // 1 year  cliff
const TEAM_DURATION  = 4 * 365 * 24 * 60 * 60; // 4 year vesting
const ADV_CLIFF      = 270 * 24 * 60 * 60;  // 9 month cliff
const ADV_DURATION   = 540 * 24 * 60 * 60;  // 18 month vesting

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the most recent deployment JSON to get core contract addresses.
 */
function loadLatestDeployment(network) {
  const files = fs.readdirSync(".")
    .filter(f => f.startsWith(`deployment-${network}-`) && f.endsWith(".json"))
    .map(f => ({ name: f, mtime: fs.statSync(f).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new Error(`No deployment JSON found for network '${network}'. Run deploy.js first.`);
  }

  const data = JSON.parse(fs.readFileSync(files[0].name, "utf8"));
  console.log(`   Loaded deployment: ${files[0].name}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "=".repeat(65));
  console.log("  DWAP FUNDRAISING DEPLOYMENT");
  console.log("=".repeat(65) + "\n");

  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;
  console.log(`Network  : ${network}`);
  console.log(`Deployer : ${deployer.address}\n`);

  // ── 0. Load existing deployment ──────────────────────────────────────────
  console.log("0. Loading core deployment addresses...");
  const coreDeployment = loadLatestDeployment(network);
  const tokenAddr    = coreDeployment.addresses.dwapToken;
  const timelockAddr = coreDeployment.addresses.dwapTimelock;
  console.log(`   DWAP Token   : ${tokenAddr}`);
  console.log(`   DWAP Timelock: ${timelockAddr}\n`);

  const tokenContract = await hre.ethers.getContractAt("DWAP_Token", tokenAddr);
  const deployerBalance = await tokenContract.balanceOf(deployer.address);
  console.log(`   Deployer DWAP balance: ${hre.ethers.formatEther(deployerBalance)} DWAP\n`);

  // ── 1. Deploy DWAP_VestingFactory ─────────────────────────────────────────
  console.log("1. Deploying DWAP_VestingFactory...");
  const VestingFactory = await hre.ethers.getContractFactory("DWAP_VestingFactory");
  const vestingFactory = await VestingFactory.deploy(tokenAddr, deployer.address);
  await vestingFactory.waitForDeployment();
  const vestingFactoryAddr = await vestingFactory.getAddress();
  console.log(`   DWAP_VestingFactory: ${vestingFactoryAddr}\n`);

  // ── 2. Deploy DWAP_PrivateSale ────────────────────────────────────────────
  console.log("2. Deploying DWAP_PrivateSale...");
  const PrivateSale = await hre.ethers.getContractFactory("DWAP_PrivateSale");
  const privateSale = await PrivateSale.deploy(
    tokenAddr,
    PRIVATE_TOKENS_PER_BNB,
    PRIVATE_HARD_CAP,
    PRIVATE_SOFT_CAP,
    PRIVATE_MIN_CONTRIBUTION,
    PRIVATE_MAX_CONTRIBUTION,
    PRIVATE_VESTING_CLIFF,
    PRIVATE_VESTING_DURATION,
    timelockAddr,   // treasury = Timelock
    deployer.address
  );
  await privateSale.waitForDeployment();
  const privateSaleAddr = await privateSale.getAddress();
  console.log(`   DWAP_PrivateSale: ${privateSaleAddr}\n`);

  // ── 3. Deploy DWAP_PublicSale ─────────────────────────────────────────────
  console.log("3. Deploying DWAP_PublicSale...");
  const PublicSale = await hre.ethers.getContractFactory("DWAP_PublicSale");
  const publicSale = await PublicSale.deploy(
    tokenAddr,
    PUBLIC_TOKENS_PER_BNB,
    PUBLIC_HARD_CAP,
    PUBLIC_SOFT_CAP,
    PUBLIC_MIN_CONTRIBUTION,
    PUBLIC_MAX_CONTRIBUTION,
    PUBLIC_LOCKUP_DURATION,
    timelockAddr,   // treasury = Timelock
    deployer.address
  );
  await publicSale.waitForDeployment();
  const publicSaleAddr = await publicSale.getAddress();
  console.log(`   DWAP_PublicSale: ${publicSaleAddr}\n`);

  // ── 4. Distribute tokens ──────────────────────────────────────────────────
  console.log("4. Distributing tokens...");

  // 4a. Fund VestingFactory with team + advisor allocation
  const factoryFund = TEAM_ALLOCATION + ADVISOR_ALLOCATION; // 250 M
  const tx1 = await tokenContract.transfer(vestingFactoryAddr, factoryFund);
  await tx1.wait();
  console.log(`   → VestingFactory   : ${hre.ethers.formatEther(factoryFund)} DWAP  (team 150M + advisors 100M)`);

  // 4b. Fund PrivateSale
  const tx2 = await tokenContract.transfer(privateSaleAddr, PRIVATE_SALE_TOKENS);
  await tx2.wait();
  console.log(`   → PrivateSale      : ${hre.ethers.formatEther(PRIVATE_SALE_TOKENS)} DWAP`);

  // 4c. Fund PublicSale
  const tx3 = await tokenContract.transfer(publicSaleAddr, PUBLIC_SALE_TOKENS);
  await tx3.wait();
  console.log(`   → PublicSale       : ${hre.ethers.formatEther(PUBLIC_SALE_TOKENS)} DWAP`);

  // 4d. Remaining tokens → Timelock (community 100M + ecosystem 100M + treasury 375M = 575M)
  //     ⚠️ MAINNET: Community (100M) should transfer to a separate community multisig wallet
  //     before this step. On testnet all goes to Timelock for simplicity.
  const timelockTotal = await tokenContract.balanceOf(deployer.address);
  const tx4 = await tokenContract.transfer(timelockAddr, timelockTotal);
  await tx4.wait();
  console.log(`   → Timelock (DAO)   : ${hre.ethers.formatEther(timelockTotal)} DWAP`);
  console.log(`     ↳ Community/Airdrop   : 100,000,000 (DAO releases via governance)`);
  console.log(`     ↳ Ecosystem/Liquidity : 100,000,000 (DEX liquidity + grants)`);
  console.log(`     ↳ Treasury           : 375,000,000 (long-term protocol reserve)`);
  console.log();

  // ── 5. Create team & advisor vestings ─────────────────────────────────────
  //
  // ⚠️  TESTNET PLACEHOLDER: deployer.address is used as beneficiary.
  //     Replace with real team/advisor wallet addresses before mainnet.
  //
  console.log("5. Creating team & advisor vesting schedules...");
  const vestingStart = BigInt(Math.floor(Date.now() / 1000));

  const vestingParams = [
    {
      // ── Team Slot 1 (e.g. CTO) — 75M DWAP, 4yr vest, 1yr cliff
      beneficiary    : deployer.address, // TODO: replace with real address
      amount         : hre.ethers.parseEther("75000000"),
      startTime      : vestingStart,
      cliffDuration  : BigInt(TEAM_CLIFF),
      vestingDuration: BigInt(TEAM_DURATION),
      revocable      : true,
    },
    {
      // ── Team Slot 2 (e.g. CEO) — 75M DWAP, 4yr vest, 1yr cliff
      beneficiary    : deployer.address, // TODO: replace with real address
      amount         : hre.ethers.parseEther("75000000"),
      startTime      : vestingStart,
      cliffDuration  : BigInt(TEAM_CLIFF),
      vestingDuration: BigInt(TEAM_DURATION),
      revocable      : true,
    },
    {
      // ── Advisors / Strategic Investors — 100M DWAP, 18mo vest, 9mo cliff
      beneficiary    : deployer.address, // TODO: replace with real address
      amount         : hre.ethers.parseEther("100000000"),
      startTime      : vestingStart,
      cliffDuration  : BigInt(ADV_CLIFF),
      vestingDuration: BigInt(ADV_DURATION),
      revocable      : true,
    },
  ];

  const txVest = await vestingFactory.batchCreateVesting(vestingParams);
  const receiptVest = await txVest.wait();
  const vestingAddrs = [];
  for (const log of receiptVest.logs) {
    try {
      const parsed = vestingFactory.interface.parseLog(log);
      if (parsed && parsed.name === "VestingCreated") {
        vestingAddrs.push(parsed.args[0]);
      }
    } catch {}
  }
  console.log(`   Created ${vestingAddrs.length} vesting vault(s):`);
  vestingAddrs.forEach((addr, i) => console.log(`   [${i + 1}] ${addr}`));
  console.log();

  // ── 6. Transfer ownership to Timelock (DAO) ───────────────────────────────
  console.log("6. Transferring ownership to Timelock (DAO)...");

  const txOwn1 = await vestingFactory.transferOwnership(timelockAddr);
  await txOwn1.wait();
  console.log(`   VestingFactory ownership → Timelock ✓`);

  const txOwn2 = await privateSale.transferOwnership(timelockAddr);
  await txOwn2.wait();
  console.log(`   PrivateSale ownership    → Timelock ✓`);

  const txOwn3 = await publicSale.transferOwnership(timelockAddr);
  await txOwn3.wait();
  console.log(`   PublicSale ownership     → Timelock ✓\n`);

  // ── 7. Summary ────────────────────────────────────────────────────────────
  console.log("=".repeat(65));
  console.log("  FUNDRAISING DEPLOYMENT SUMMARY");
  console.log("=".repeat(65));
  console.log(`DWAP_VestingFactory : ${vestingFactoryAddr}`);
  console.log(`DWAP_PrivateSale    : ${privateSaleAddr}`);
  console.log(`DWAP_PublicSale     : ${publicSaleAddr}`);
  console.log("─".repeat(65));
  console.log("Token Distribution:");
  console.log(`  Team (VestingFactory)     :  150,000,000 DWAP  (15.0%)`);
  console.log(`  Advisors / Strategic      :  100,000,000 DWAP  (10.0%)  9mo cliff, 18mo vest`);
  console.log(`  Community / Airdrop       :  100,000,000 DWAP  (10.0%)  DAO-released`);
  console.log(`  Ecosystem / Liquidity     :  100,000,000 DWAP  (10.0%)  DAO-released`);
  console.log(`  Private Sale              :  100,000,000 DWAP  (10.0%)`);
  console.log(`  Public Sale               :   75,000,000 DWAP  ( 7.5%)`);
  console.log(`  Treasury (DAO)            :  375,000,000 DWAP  (37.5%)`);
  console.log("─".repeat(65));
  console.log("Private Sale Config:");
  console.log(`  Rate      : 100,000 DWAP / BNB  (~$0.006 @ $600 BNB)`);
  console.log(`  Hard Cap  : 1,000 BNB  |  Soft Cap: 100 BNB`);
  console.log(`  Min/Max   : 0.1 BNB / 20 BNB per wallet`);
  console.log(`  Vesting   : 90-day cliff, 365-day total`);
  console.log("Public Sale Config:");
  console.log(`  Rate      : 50,000 DWAP / BNB  (~$0.012 @ $600 BNB)`);
  console.log(`  Hard Cap  : 1,500 BNB  |  Soft Cap: 150 BNB`);
  console.log(`  Min/Max   : 0.05 BNB / 5 BNB per wallet`);
  console.log(`  Lockup    : 30 days after finalization`);
  console.log("─".repeat(65));
  console.log("All contracts owned by Timelock (DAO) ✓");
  console.log("Treasury (625M DWAP) held by Timelock ✓");
  console.log("=".repeat(65));

  // ── 8. Next Steps ─────────────────────────────────────────────────────────
  console.log("\nNEXT STEPS:");
  console.log("  1. Generate Merkle root for private whitelist:");
  console.log("     npx hardhat run scripts/generate-merkle.js");
  console.log("  2. Propose via DAO: privateSale.setMerkleRoot(root)");
  console.log("  3. Propose via DAO: privateSale.startSale()");
  console.log("  4. Verify contracts:");
  console.log("     node scripts/verify-fundraising.js");
  console.log();

  // ── 9. Save deployment JSON ───────────────────────────────────────────────
  const deploymentData = {
    network,
    timestamp: new Date().toISOString(),
    phase: "fundraising",
    deployer: deployer.address,
    coreAddresses: coreDeployment.addresses,
    fundraisingAddresses: {
      vestingFactory : vestingFactoryAddr,
      privateSale    : privateSaleAddr,
      publicSale     : publicSaleAddr,
    },
    vestingVaults: vestingAddrs,
    tokenAllocation: {
      team              : "150,000,000 DWAP (15.0%) — 1yr cliff, 4yr vest",
      advisors          : "100,000,000 DWAP (10.0%) — 9mo cliff, 18mo vest",
      community         : "100,000,000 DWAP (10.0%) — held in Timelock, DAO-released",
      ecosystem         : "100,000,000 DWAP (10.0%) — held in Timelock, DAO-released",
      privateSale       : "100,000,000 DWAP (10.0%)",
      publicSale        :  "75,000,000 DWAP  (7.5%)",
      timelockTreasury  : "375,000,000 DWAP (37.5%)",
      timelockTotalHeld : "575,000,000 DWAP (community+ecosystem+treasury)",
    },
    privateSaleConfig: {
      tokensPerBNB   : "100,000 DWAP/BNB",
      hardCapBNB     : "1,000 BNB",
      softCapBNB     :   "100 BNB",
      minBNB         :   "0.1 BNB",
      maxBNB         :    "20 BNB",
      vestingCliff   : "90 days",
      vestingDuration: "365 days",
    },
    publicSaleConfig: {
      tokensPerBNB  : "50,000 DWAP/BNB",
      hardCapBNB    : "1,500 BNB",
      softCapBNB    :   "150 BNB",
      minBNB        :  "0.05 BNB",
      maxBNB        :     "5 BNB",
      lockupDuration: "30 days",
    },
    ownershipTransferred: {
      vestingFactory : timelockAddr,
      privateSale    : timelockAddr,
      publicSale     : timelockAddr,
    },
  };

  const outFile = `deployment-fundraising-${network}-${Date.now()}.json`;
  fs.writeFileSync(outFile, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment data saved to: ${outFile}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
