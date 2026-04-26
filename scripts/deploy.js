const hre = require("hardhat");

async function main() {
  console.log("Starting DWAP BSC Deployment (Immutable Contracts)...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}\n`);

  // ==================== 1. Deploy DWAP Token ====================
  console.log("1. Deploying DWAP Token...");
  const DWAP_Token = await hre.ethers.getContractFactory("DWAP_Token");
  const dwapToken = await DWAP_Token.deploy(deployer.address);
  await dwapToken.waitForDeployment();
  const dwapTokenAddr = await dwapToken.getAddress();
  console.log(`   DWAP Token: ${dwapTokenAddr}\n`);

  // ==================== 2. Deploy Timelock ====================
  console.log("2. Deploying DWAP Timelock...");
  const minDelay = 172800; // 2 days
  const DWAP_Timelock = await hre.ethers.getContractFactory("DWAP_Timelock");
  const dwapTimelock = await DWAP_Timelock.deploy(
    minDelay,
    [],                  // proposers (Governor will be added below)
    [deployer.address],  // executors (initial)
    deployer.address     // admin
  );
  await dwapTimelock.waitForDeployment();
  const dwapTimelockAddr = await dwapTimelock.getAddress();
  console.log(`   DWAP Timelock: ${dwapTimelockAddr}\n`);

  // ==================== 3. Deploy Governor ====================
  console.log("3. Deploying DWAP Governor...");
  const PROPOSAL_FEE = hre.ethers.parseEther("1000"); // 1000 DWAP proposal fee (burned)
  const DWAP_Governor = await hre.ethers.getContractFactory("DWAP_Governor");
  const dwapGovernor = await DWAP_Governor.deploy(
    dwapTokenAddr,
    dwapTimelockAddr,
    PROPOSAL_FEE
  );
  await dwapGovernor.waitForDeployment();
  const dwapGovernorAddr = await dwapGovernor.getAddress();
  console.log(`   DWAP Governor: ${dwapGovernorAddr}\n`);

  // ==================== 4. Deploy Burn Controller ====================
  console.log("4. Deploying DWAP Burn Controller...");
  const DWAP_BurnController = await hre.ethers.getContractFactory("DWAP_BurnController");
  const burnController = await DWAP_BurnController.deploy(
    dwapTokenAddr,
    deployer.address,
    0 // No daily limit initially (0 = unlimited)
  );
  await burnController.waitForDeployment();
  const burnControllerAddr = await burnController.getAddress();
  console.log(`   DWAP Burn Controller: ${burnControllerAddr}\n`);

  // ==================== 5. Set up Timelock roles ====================
  console.log("5. Setting up Timelock roles...");
  const timelockContract = await hre.ethers.getContractAt("DWAP_Timelock", dwapTimelockAddr);

  // Grant PROPOSER_ROLE to Governor
  const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
  const tx1 = await timelockContract.grantRole(PROPOSER_ROLE, dwapGovernorAddr);
  await tx1.wait();
  console.log(`   Granted PROPOSER_ROLE to Governor`);

  // Grant EXECUTOR_ROLE to public (address(0)) — anyone can execute after timelock
  const EXECUTOR_ROLE = await timelockContract.EXECUTOR_ROLE();
  const tx2 = await timelockContract.grantRole(EXECUTOR_ROLE, "0x0000000000000000000000000000000000000000");
  await tx2.wait();
  console.log(`   Granted EXECUTOR_ROLE to public`);

  // Grant CANCELLER_ROLE to Governor
  const CANCELLER_ROLE = await timelockContract.CANCELLER_ROLE();
  const tx3 = await timelockContract.grantRole(CANCELLER_ROLE, dwapGovernorAddr);
  await tx3.wait();
  console.log(`   Granted CANCELLER_ROLE to Governor\n`);

  // ==================== 6. Activate Voting Power (Delegate) ====================
  console.log("6. Activating deployer voting power (self-delegate)...");
  const tokenContract = await hre.ethers.getContractAt("DWAP_Token", dwapTokenAddr);
  const tx4 = await tokenContract.delegate(deployer.address);
  await tx4.wait();
  console.log(`   Deployer delegated to self → voting power activated\n`);

  // ==================== 7. Transfer Ownerships to Timelock (DAO) ====================
  console.log("7. Transferring ownerships to Timelock (DAO control)...");

  // Transfer Token ownership → Timelock
  const tx5 = await tokenContract.transferOwnership(dwapTimelockAddr);
  await tx5.wait();
  console.log(`   DWAP Token ownership → Timelock ✓`);

  // Transfer BurnController ownership → Timelock
  const burnControllerContract = await hre.ethers.getContractAt("DWAP_BurnController", burnControllerAddr);
  const tx6 = await burnControllerContract.transferOwnership(dwapTimelockAddr);
  await tx6.wait();
  console.log(`   DWAP BurnController ownership → Timelock ✓\n`);

  // ==================== 8. Renounce Timelock Admin Role ====================
  console.log("8. Renouncing Timelock DEFAULT_ADMIN_ROLE from deployer...");
  const DEFAULT_ADMIN_ROLE = await timelockContract.DEFAULT_ADMIN_ROLE();
  const tx7 = await timelockContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
  await tx7.wait();
  console.log(`   DEFAULT_ADMIN_ROLE renounced — Timelock fully autonomous ✓\n`);

  // ==================== 9. Output Summary ====================
  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY (Immutable — Non-Upgradeable)");
  console.log("=".repeat(60));
  console.log(`DWAP Token:           ${dwapTokenAddr}`);
  console.log(`DWAP Timelock:        ${dwapTimelockAddr}`);
  console.log(`DWAP Governor:        ${dwapGovernorAddr}`);
  console.log(`DWAP Burn Controller: ${burnControllerAddr}`);
  console.log("=".repeat(60));
  console.log("OWNERSHIP & ROLES STATUS:");
  console.log(`  Token.owner         → Timelock (DAO) ✓`);
  console.log(`  BurnController.owner → Timelock (DAO) ✓`);
  console.log(`  Timelock.PROPOSER   → Governor ✓`);
  console.log(`  Timelock.EXECUTOR   → public (address(0)) ✓`);
  console.log(`  Timelock.CANCELLER  → Governor ✓`);
  console.log(`  Timelock.ADMIN      → renounced ✓`);
  console.log(`  Deployer delegation → self ✓`);
  console.log("=".repeat(60));

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    solidityVersion: "0.8.34",
    architecture: "immutable (non-upgradeable)",
    deployer: deployer.address,
    proposalFee: "1000 DWAP",
    addresses: {
      dwapToken: dwapTokenAddr,
      dwapTimelock: dwapTimelockAddr,
      dwapGovernor: dwapGovernorAddr,
      dwapBurnController: burnControllerAddr,
    },
    ownershipTransferred: {
      tokenOwner: dwapTimelockAddr,
      burnControllerOwner: dwapTimelockAddr,
      timelockAdminRenounced: true,
    },
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\nDeployment data saved to deployment file.\n");

  console.log("NEXT STEP:");
  console.log("Verify contracts on BscScan: node scripts/verify-direct.js");
  console.log("5. Community: delegate votes, create proposals, burn tokens\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
