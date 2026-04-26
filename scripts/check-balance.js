const { ethers } = require("ethers");

async function main() {
  const addr = "0x4D28DE16E06FBc99EF5405aa0354B6453BA25447";
  const rpcs = [
    "https://bsc-testnet.public.blastapi.io",
    "https://bsc-testnet-rpc.publicnode.com",
    "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  ];

  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const balance = await provider.getBalance(addr);
      console.log(`[${rpc}]`);
      console.log(`  Balance: ${ethers.formatEther(balance)} tBNB`);
      return;
    } catch (e) {
      console.log(`[${rpc}] Failed: ${e.message}`);
    }
  }
}

main();
