# DWAP Token — BSC BEP20

## Overview

DWAP is a fully decentralized governance token for Web3 infrastructure on Binance Smart Chain (BSC). All contracts are **immutable (non-upgradeable)** — no proxies, no admin backdoors.

| Contract | Purpose |
|---|---|
| **DWAP Token** | BEP20 governance token with burn, pause, permit & voting |
| **DWAP Governor** | On-chain DAO governance with proposal fee |
| **DWAP Timelock** | 2-day execution delay for security |
| **DWAP Burn Controller** | Community burn with daily limits |

## Key Features

- ✅ **1 Billion Fixed Supply** — no minting after deployment
- ✅ **Immutable Contracts** — no upgrades, no proxy, code is final
- ✅ **ERC20Votes** — on-chain delegation and voting power
- ✅ **ERC20Permit** — gasless approvals (EIP-2612)
- ✅ **Pausable** — emergency pause on Token and BurnController
- ✅ **ReentrancyGuard** — on BurnController's burn function
- ✅ **Proposal Fee** — 1,000 DWAP burned per proposal (anti-spam)
- ✅ **1M DWAP Proposal Threshold** — serious governance participation
- ✅ **Community & Owner Burns** — tracked separately
- ✅ **Token Recovery** — `recoverERC20()` rescues stuck tokens
- ✅ **Timelock Protection** — 2-day delay before execution
- ✅ **Multi-chain Ready** — bridge to Vite and other chains planned

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   DWAP Token    │◄────│  DWAP Governor  │
│  (ERC20+Votes)  │     │  (DAO Proposals)│
└────────┬────────┘     └────────┬────────┘
         │                       │
         │              ┌────────▼────────┐
         │              │  DWAP Timelock  │
         │              │  (2-day delay)  │
         │              └─────────────────┘
         │
┌────────▼────────┐
│ Burn Controller │
│ (Daily limits)  │
└─────────────────┘
```

All 4 contracts are deployed directly — **no proxies**.

## Tech Stack

- **Solidity**: 0.8.34 (EVM: Cancun)
- **OpenZeppelin**: v5.6.1 (non-upgradeable)
- **Hardhat**: v2.x with optimizer (200 runs)
- **Network**: BSC (BEP20)

## BSC Testnet Deployment

| Contract | Address |
|---|---|
| DWAP Token | [`0x6438357D1A36537b864F6734e072661Cf8796759`](https://testnet.bscscan.com/address/0x6438357D1A36537b864F6734e072661Cf8796759) |
| DWAP Timelock | [`0x751E65B6A30ed777B646dD74860db214A87060B2`](https://testnet.bscscan.com/address/0x751E65B6A30ed777B646dD74860db214A87060B2) |
| DWAP Governor | [`0x489129155846d62f23339E0c74ea2533205Ad9Cf`](https://testnet.bscscan.com/address/0x489129155846d62f23339E0c74ea2533205Ad9Cf) |
| DWAP Burn Controller | [`0x0A1bA716EBFb46453d51A1e23e19ff20E14A854D`](https://testnet.bscscan.com/address/0x0A1bA716EBFb46453d51A1e23e19ff20E14A854D) |

All contracts verified on [BscScan Testnet](https://testnet.bscscan.com/).

**Post-deploy setup (executed automatically by deploy script):**
- Token & BurnController ownership → Timelock (DAO)
- Timelock DEFAULT_ADMIN_ROLE → renounced
- Deployer self-delegated voting power

Full deployment data: `deployments/bsc-testnet.json`

## Contract Details

### DWAP_Token.sol
- ERC20 + ERC20Burnable + ERC20Pausable + ERC20Permit + ERC20Votes + Ownable
- 1B tokens minted to deployer in constructor
- `ownerBurn()` / `communityBurn()` / `communityBurnFrom()` — separate tracking
- `pause()` / `unpause()` — owner only
- `recoverERC20()` — rescue accidentally sent tokens
- `getTokenInfo()` — returns name, symbol, decimals, supply, IPFS logo, description

### DWAP_Governor.sol
- OpenZeppelin Governor + GovernorSettings + GovernorCountingSimple + GovernorVotes + GovernorVotesQuorumFraction + GovernorTimelockControl
- 2-day voting delay, 1-week voting period, 4% quorum
- **1,000,000 DWAP** proposal threshold
- **1,000 DWAP** proposal fee (burned on `propose()`)
- `setProposalFee()` — governance-only (through Timelock)

### DWAP_Timelock.sol
- TimelockController with 2-day (172800s) minimum delay
- PROPOSER_ROLE & CANCELLER_ROLE → Governor
- EXECUTOR_ROLE → `address(0)` (anyone can execute)

### DWAP_BurnController.sol
- Ownable + Pausable + ReentrancyGuard
- `immutable dwapToken` — cannot be changed after deployment
- `burnTokens()` — community burn with optional daily limit
- Configurable: `dailyBurnLimit`, `minBurnAmount`, `burnEnabled`
- Per-user and global burn tracking with events

## Governance Parameters

| Parameter | Value |
|---|---|
| Voting Delay | 2 days |
| Voting Period | 1 week |
| Proposal Threshold | 1,000,000 DWAP |
| Proposal Fee | 1,000 DWAP (burned) |
| Quorum | 4% of total supply |
| Timelock Delay | 2 days |

## Quick Start

### Deploy

```bash
npm install
npx hardhat run scripts/deploy.js --network bscTestnet
```

### Verify

```bash
node scripts/verify-direct.js
```

### Post-Deployment Steps

1. Transfer Token ownership to Timelock → full DAO control
2. Transfer BurnController ownership to Timelock
3. Renounce Timelock admin role (mainnet only)

## Security

- OpenZeppelin v5.6.1 audited base contracts
- Immutable — no upgrade functions, no proxy
- Pausable emergency controls
- ReentrancyGuard on external-facing burn
- Timelock prevents instant governance execution
- Proposal fee prevents spam attacks
- MIT License

## Roadmap

- 🔗 Vite Network bridge
- 🌐 Multi-chain deployment
- 💧 DEX liquidity pools
- 🏦 DeFi integrations
