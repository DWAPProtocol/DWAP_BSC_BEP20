const hre = require("hardhat");

// Deployed addresses from BSC Testnet deployment
const DEPLOYER = "0x4D28DE16E06FBc99EF5405aa0354B6453BA25447";
const ADDRESSES = {
  tokenImpl: "0xE9C9ec38a10EEa06F9eEa5d2F662bAb184fc9F97",
  tokenProxy: "0x1EA5a530d50AF1670936e2F4EDeEC10967704F0d",
  timelock: "0x695Bc90e7af1b5e3d99eA22108eF0159DF2Ef42E",
  governor: "0x30e3d6BdeF6E1FC13B22333e7A8D20463b3F023c",
  burnControllerImpl: "0x382C30DaE88A57749ccEF85c4265c0BE648F7d1D",
  burnControllerProxy: "0x330ADf6f8c900D117cFE55286eF59E1abDaCc900",
};

async function verifyContract(name, address, constructorArguments, contract) {
  console.log(`\nVerifying ${name} at ${address}...`);
  try {
    const verifyArgs = {
      address,
      constructorArguments,
    };
    if (contract) {
      verifyArgs.contract = contract;
    }
    await hre.run("verify:verify", verifyArgs);
    console.log(`  ✅ ${name} verified successfully!`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log(`  ✅ ${name} is already verified.`);
      return true;
    }
    console.error(`  ❌ ${name} verification failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("DWAP Contract Verification on BSC Testnet");
  console.log("=".repeat(60));

  // 1. Verify Token Implementation (no constructor args)
  await verifyContract(
    "DWAP Token Implementation",
    ADDRESSES.tokenImpl,
    [],
    "contracts/DWAP_Token.sol:DWAP_Token"
  );

  // 2. Verify Token Proxy
  // Constructor args: (implementation, initializeData)
  const tokenIface = (await hre.ethers.getContractFactory("DWAP_Token")).interface;
  const tokenInitData = tokenIface.encodeFunctionData("initialize", [DEPLOYER]);
  await verifyContract(
    "DWAP Token Proxy",
    ADDRESSES.tokenProxy,
    [ADDRESSES.tokenImpl, tokenInitData],
    "contracts/Proxies.sol:DWAP_TokenProxy"
  );

  // 3. Verify Timelock
  // Constructor args: (minDelay, proposers, executors, admin)
  await verifyContract(
    "DWAP Timelock",
    ADDRESSES.timelock,
    [172800, [], [DEPLOYER], DEPLOYER],
    "contracts/DWAP_Timelock.sol:DWAP_Timelock"
  );

  // 4. Verify Governor
  // Constructor args: (IVotes token, TimelockController timelock)
  await verifyContract(
    "DWAP Governor",
    ADDRESSES.governor,
    [ADDRESSES.tokenProxy, ADDRESSES.timelock],
    "contracts/DWAP_Governor.sol:DWAP_Governor"
  );

  // 5. Verify BurnController Implementation (no constructor args)
  await verifyContract(
    "DWAP Burn Controller Implementation",
    ADDRESSES.burnControllerImpl,
    [],
    "contracts/DWAP_BurnController.sol:DWAP_BurnController"
  );

  // 6. Verify BurnController Proxy
  // Constructor args: (implementation, initializeData)
  const burnIface = (await hre.ethers.getContractFactory("DWAP_BurnController")).interface;
  const burnInitData = burnIface.encodeFunctionData("initialize", [
    ADDRESSES.tokenProxy,
    DEPLOYER,
    0, // No daily limit initially
  ]);
  await verifyContract(
    "DWAP Burn Controller Proxy",
    ADDRESSES.burnControllerProxy,
    [ADDRESSES.burnControllerImpl, burnInitData],
    "contracts/Proxies.sol:DWAP_BurnControllerProxy"
  );

  console.log("\n" + "=".repeat(60));
  console.log("Verification complete!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
