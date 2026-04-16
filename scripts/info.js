const hre = require("hardhat");

async function main() {
  console.log("DWAP Token Contract Interaction Tools\n");

  const [deployer] = await hre.ethers.getSigners();

  // Get deployment addresses from the latest deployment file
  const fs = require("fs");
  const files = fs.readdirSync(".").filter((f) => f.startsWith("deployment-"));
  if (files.length === 0) {
    console.log("No deployment files found. Please run deploy.js first.");
    return;
  }

  const latestDeployment = files.sort().pop();
  const deploymentData = JSON.parse(fs.readFileSync(latestDeployment, "utf8"));

  console.log(`Using deployment: ${latestDeployment}\n`);

  // ==================== Get Token Info ====================
  console.log("Getting DWAP Token Information...\n");

  const dwapToken = await hre.ethers.getContractAt(
    "DWAP_Token",
    deploymentData.addresses.dwapToken
  );

  const totalSupply = await dwapToken.totalSupply();
  const deployerBalance = await dwapToken.balanceOf(deployer.address);
  const name = await dwapToken.name();
  const symbol = await dwapToken.symbol();
  const decimals = await dwapToken.decimals();

  console.log(`Token Name:      ${name}`);
  console.log(`Token Symbol:    ${symbol}`);
  console.log(`Decimals:        ${decimals}`);
  console.log(`Total Supply:    ${hre.ethers.formatUnits(totalSupply, decimals)}`);
  console.log(`Deployer Balance: ${hre.ethers.formatUnits(deployerBalance, decimals)}\n`);

  // ==================== Get Governor Info ====================
  console.log("Getting DWAP Governor Information...\n");

  const dwapGovernor = await hre.ethers.getContractAt(
    "DWAP_Governor",
    deploymentData.addresses.dwapGovernor
  );

  const votingDelay = await dwapGovernor.votingDelay();
  const votingPeriod = await dwapGovernor.votingPeriod();
  const proposalThreshold = await dwapGovernor.proposalThreshold();
  const quorum = await dwapGovernor.quorumNumerator();

  console.log(`Voting Delay:        ${votingDelay} blocks (~${(votingDelay / 20).toFixed(0)} minutes)`);
  console.log(`Voting Period:       ${votingPeriod} blocks (~${(votingPeriod / 20 / 60 / 24).toFixed(1)} days)`);
  console.log(`Proposal Threshold:  ${hre.ethers.formatUnits(proposalThreshold, decimals)} DWAP`);
  console.log(`Quorum:              ${quorum}%\n`);

  // ==================== Get Timelock Info ====================
  console.log("Getting DWAP Timelock Information...\n");

  const dwapTimelock = await hre.ethers.getContractAt(
    "DWAP_Timelock",
    deploymentData.addresses.dwapTimelock
  );

  const minDelay = await dwapTimelock.minDelay();

  console.log(`Minimum Delay:  ${minDelay} seconds (~${(minDelay / 86400).toFixed(1)} days)\n`);

  // ==================== Show Example: Create Proposal ====================
  console.log("Example: Creating a Governance Proposal\n");
  console.log("To create a proposal to transfer token ownership to DAO:");
  console.log("1. Call Governor.propose() with:");
  console.log(`   - targets: [${deploymentData.addresses.dwapToken}]`);
  console.log(`   - values: [0]`);
  console.log(`   - calldatas: [dwapToken.transferOwnership(governorAddress)]`);
  console.log(`   - description: "Transfer DWAP ownership to DAO Governor\"\n`);

  console.log("View deployment summary:");
  console.log(JSON.stringify(deploymentData, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
