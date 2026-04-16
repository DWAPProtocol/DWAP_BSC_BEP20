/**
 * DWAP BSC BEP20 Configuration
 * 
 * This file defines the constants and parameters used throughout the DWAP ecosystem.
 */

// ============================================================================
// TOKEN PARAMETERS
// ============================================================================

// Total supply: 1,000,000,000 tokens (1 billion)
const MAX_SUPPLY = "1000000000"; // in units (without decimals)
const MAX_SUPPLY_WEI = "1000000000000000000000000000"; // with 18 decimals

// Initial supply equals max supply
const INITIAL_SUPPLY = MAX_SUPPLY;
const INITIAL_SUPPLY_WEI = MAX_SUPPLY_WEI;

const TOKEN_NAME = "DWAP Token";
const TOKEN_SYMBOL = "DWAP";
const TOKEN_DECIMALS = 18;

// ============================================================================
// GOVERNANCE PARAMETERS
// ============================================================================

// Voting delay: 2 days (48 hours)
// In blocks: 48 hours / 3 seconds per block ≈ 57,600 blocks
// Using 48 hours = 172,800 seconds
const VOTING_DELAY = "172800"; // seconds, will be converted to blocks

// Voting period: 1 week (7 days)
// In blocks: 7 days / 3 seconds per block ≈ 201,600 blocks
// Using 604,800 seconds (7 days)
const VOTING_PERIOD = "604800"; // seconds, converted to blocks

// Proposal threshold: 1 DWAP token
const PROPOSAL_THRESHOLD = "1000000000000000000"; // 1 token with 18 decimals

// Quorum: 4% of total voting supply
const QUORUM_PERCENTAGE = 4; // percent

// ============================================================================
// TIMELOCK PARAMETERS
// ============================================================================

// Timelock delay: 2 days (172,800 seconds)
const TIMELOCK_DELAY = 172800; // seconds

// ============================================================================
// BURN CONTROLLER PARAMETERS
// ============================================================================

// Daily burn limit per user (0 = unlimited)
const DAILY_BURN_LIMIT = "0"; // unlimited initially

// Minimum burn amount per transaction
const MIN_BURN_AMOUNT = "1000000000000000000"; // 1 token

// ============================================================================
// DEPLOYMENT CONFIGURATION
// ============================================================================

const NETWORK_CONFIG = {
  // Binance Smart Chain Mainnet
  bsc: {
    name: "Binance Smart Chain",
    chainId: 56,
    rpc: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org:443",
    explorer: "https://bscscan.com",
    explorerAPI: process.env.BSCSCAN_API_KEY,
  },

  // Binance Smart Chain Testnet
  bscTestnet: {
    name: "BSC Testnet",
    chainId: 97,
    rpc: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc.binance.org:8545",
    explorer: "https://testnet.bscscan.com",
    explorerAPI: process.env.BSCSCAN_API_KEY,
  },
};

// ============================================================================
// GAS OPTIMIZATION
// ============================================================================

const COMPILER_CONFIG = {
  version: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200, // Balance between deployment size and runtime gas
    },
  },
};

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

const ROLES = {
  DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
  PROPOSER_ROLE: "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1",
  EXECUTOR_ROLE: "0xd8aa0f3194971a2a116369877cc86f286e41f6df8eff83a9a4485f77457b49f4",
  CANCELLER_ROLE: "0xfd643c72710c63c0180259efa8b60fbcc3fcbcf9346a61cabb2dae8db3e7be6d",
};

// ============================================================================
// ADDRESSES (Placeholder - will be updated after deployment)
// ============================================================================

const DEPLOYED_ADDRESSES = {
  dwapToken: null, // Will be set after deployment
  dwapTokenImpl: null,
  dwapGovernor: null,
  dwapTimelock: null,
  burnController: null,
  burnControllerImpl: null,
};

// ============================================================================
// MODULE.EXPORTS
// ============================================================================

module.exports = {
  // Token parameters
  MAX_SUPPLY,
  MAX_SUPPLY_WEI,
  INITIAL_SUPPLY,
  INITIAL_SUPPLY_WEI,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,

  // Governance parameters
  VOTING_DELAY,
  VOTING_PERIOD,
  PROPOSAL_THRESHOLD,
  QUORUM_PERCENTAGE,

  // Timelock parameters
  TIMELOCK_DELAY,

  // Burn controller parameters
  DAILY_BURN_LIMIT,
  MIN_BURN_AMOUNT,

  // Deployment configuration
  NETWORK_CONFIG,
  COMPILER_CONFIG,

  // Roles
  ROLES,

  // Addresses
  DEPLOYED_ADDRESSES,
};
