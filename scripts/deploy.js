const hre = require("hardhat");

async function main() {
  console.log("Starting DWAP BSC Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying from account: ${deployer.address}\n`);

  // ==================== 1. Deploy DWAP Token ====================
  console.log("1. Deploying DWAP Token Implementation...");
  const DWAP_Token = await hre.ethers.getContractFactory("DWAP_Token");
  const dwapTokenImpl = await DWAP_Token.deploy();
  await dwapTokenImpl.waitForDeployment();
  const dwapTokenImplAddr = await dwapTokenImpl.getAddress();
  console.log(`   DWAP Token Implementation: ${dwapTokenImplAddr}`);

  // Initialize data for proxy
  const initializeData = dwapTokenImpl.interface.encodeFunctionData("initialize", [
    deployer.address,
  ]);

  // Wait for implementation to propagate on testnet
  console.log("   Waiting for implementation to propagate...");
  await new Promise(r => setTimeout(r, 5000));

  // Deploy Token Proxy
  console.log("2. Deploying DWAP Token Proxy...");
  const DWAP_TokenProxy = await hre.ethers.getContractFactory("DWAP_TokenProxy");
  const dwapTokenProxy = await DWAP_TokenProxy.deploy(dwapTokenImplAddr, initializeData);
  await dwapTokenProxy.waitForDeployment();
  const dwapTokenProxyAddr = await dwapTokenProxy.getAddress();
  console.log(`   DWAP Token Proxy: ${dwapTokenProxyAddr}\n`);

  // ==================== 2. Deploy Timelock ====================
  console.log("3. Deploying DWAP Timelock...");
  const minDelay = 172800; // 2 days
  const DWAP_Timelock = await hre.ethers.getContractFactory("DWAP_Timelock");
  const dwapTimelock = await DWAP_Timelock.deploy(
    minDelay,
    [], // proposers (can be set by Governor later)
    [deployer.address], // executors (initial executor is deployer)
    deployer.address // admin
  );
  await dwapTimelock.waitForDeployment();
  const dwapTimelockAddr = await dwapTimelock.getAddress();
  console.log(`   DWAP Timelock: ${dwapTimelockAddr}\n`);

  // ==================== 3. Deploy Governor ====================
  console.log("4. Deploying DWAP Governor...");
  const DWAP_Governor = await hre.ethers.getContractFactory("DWAP_Governor");
  const dwapGovernor = await DWAP_Governor.deploy(
    dwapTokenProxyAddr, // DWAP Token for voting
    dwapTimelockAddr // Timelock for execution delay
  );
  await dwapGovernor.waitForDeployment();
  const dwapGovernorAddr = await dwapGovernor.getAddress();
  console.log(`   DWAP Governor: ${dwapGovernorAddr}\n`);

  // ==================== 4. Deploy Burn Controller ====================
  console.log("5. Deploying DWAP Burn Controller Implementation...");
  const DWAP_BurnController = await hre.ethers.getContractFactory("DWAP_BurnController");
  const burnControllerImpl = await DWAP_BurnController.deploy();
  await burnControllerImpl.waitForDeployment();
  const burnControllerImplAddr = await burnControllerImpl.getAddress();
  console.log(`   DWAP Burn Controller Implementation: ${burnControllerImplAddr}`);

  // Initialize Burn Controller Proxy
  const initializeBurnData = burnControllerImpl.interface.encodeFunctionData("initialize", [
    dwapTokenProxyAddr,
    deployer.address,
    0, // No daily limit initially
  ]);

  // Wait for implementation to propagate on testnet
  console.log("   Waiting for implementation to propagate...");
  await new Promise(r => setTimeout(r, 5000));

  console.log("6. Deploying DWAP Burn Controller Proxy...");
  const DWAP_BurnControllerProxy = await hre.ethers.getContractFactory(
    "DWAP_BurnControllerProxy"
  );
  const burnControllerProxy = await DWAP_BurnControllerProxy.deploy(
    burnControllerImplAddr,
    initializeBurnData
  );
  await burnControllerProxy.waitForDeployment();
  const burnControllerProxyAddr = await burnControllerProxy.getAddress();
  console.log(`   DWAP Burn Controller Proxy: ${burnControllerProxyAddr}\n`);

  // ==================== 5. Set up Timelock roles ====================
  console.log("7. Setting up Timelock roles...");
  const timelockContract = await hre.ethers.getContractAt(
    "DWAP_Timelock",
    dwapTimelockAddr
  );

  // Grant PROPOSER_ROLE to Governor
  const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
  const tx1 = await timelockContract.grantRole(PROPOSER_ROLE, dwapGovernorAddr);
  await tx1.wait();
  console.log(`   Granted PROPOSER_ROLE to Governor`);

  // Grant EXECUTOR_ROLE to public (0x0) for anyone to execute
  const EXECUTOR_ROLE = await timelockContract.EXECUTOR_ROLE();
  const PUBLIC_ADDRESS = "0x0000000000000000000000000000000000000000";
  const tx2 = await timelockContract.grantRole(EXECUTOR_ROLE, PUBLIC_ADDRESS);
  await tx2.wait();
  console.log(`   Granted EXECUTOR_ROLE to public\n`);

  // ==================== 6. Output Summary ====================
  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`DWAP Token Proxy:          ${dwapTokenProxyAddr}`);
  console.log(`DWAP Token Implementation: ${dwapTokenImplAddr}`);
  console.log(`DWAP Governor:             ${dwapGovernorAddr}`);
  console.log(`DWAP Timelock:             ${dwapTimelockAddr}`);
  console.log(`DWAP Burn Controller:      ${burnControllerProxyAddr}`);
  console.log(`DWAP Burn Ctrl Impl:       ${burnControllerImplAddr}`);
  console.log("=".repeat(60));

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    addresses: {
      dwapToken: dwapTokenProxyAddr,
      dwapTokenImpl: dwapTokenImplAddr,
      dwapGovernor: dwapGovernorAddr,
      dwapTimelock: dwapTimelockAddr,
      burnController: burnControllerProxyAddr,
      burnControllerImpl: burnControllerImplAddr,
    },
    deployer: deployer.address,
  };

  fs.writeFileSync(
    `deployment-${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("\nDeployment data saved to deployment file.\n");

  // ==================== 7. Next Steps ====================
  console.log("NEXT STEPS:");
  console.log(`1. Verify contracts on BscScan:`);
  console.log(`   npx hardhat verify --network ${hre.network.name} ${dwapTokenImplAddr}`);
  console.log(`   npx hardhat verify --network ${hre.network.name} ${dwapGovernorAddr} ${dwapTokenProxyAddr} ${dwapTimelockAddr}`);
  console.log(`2. Transfer ownership to DWAP Governor when ready`);
  console.log(`3. Community members can now vote on proposals and burn tokens\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
