# DWAP Token - BSC BEP20 Deployment

## Overview

DWAP is a decentralized governance token for Web3 infrastructure on Binance Smart Chain (BSC). This project includes:

- **DWAP Token**: BEP20 token with governance and burn capabilities
- **DWAP Governor**: OpenZeppelin-based DAO governance
- **DWAP Timelock**: 2-day execution delay for security
- **DWAP Burn Controller**: Manages token burns by both owner and community

## Key Features

- ✅ **1 Billion Max Supply** (1B tokens)
- ✅ **Governance Token** with voting power delegation
- ✅ **Upgradeable** using UUPS proxy pattern
- ✅ **Community Burn**: Users can burn their own tokens
- ✅ **Owner Burn**: Owner can burn from treasury
- ✅ **DAO Control**: Full ownership transferable to Governor
- ✅ **Timelock Protection**: 2-day delay before execution
- ✅ **Multi-chain Ready**: Bridge to Vite and other chains in future

## Deployment

### Prerequisites

```bash
npm install
cp .env.example .env
# Edit .env with your settings
```

### Deploy to BSC Testnet

```bash
npm run deploy:testnet
```

### Deploy to BSC Mainnet

```bash
npm run deploy
```

### Current Testnet Deployment

The latest tracked deployment addresses are stored in:

```bash
deployments/bsc-testnet.json
```

Current BSC Testnet addresses:

- `DWAP Token Proxy`: `0x1EA5a530d50AF1670936e2F4EDeEC10967704F0d`
- `DWAP Token Implementation`: `0xE9C9ec38a10EEa06F9eEa5d2F662bAb184fc9F97`
- `DWAP Timelock`: `0x695Bc90e7af1b5e3d99eA22108eF0159DF2Ef42E`
- `DWAP Governor`: `0x30e3d6BdeF6E1FC13B22333e7A8D20463b3F023c`
- `DWAP Burn Controller Proxy`: `0x330ADf6f8c900D117cFE55286eF59E1abDaCc900`
- `DWAP Burn Controller Implementation`: `0x382C30DaE88A57749ccEF85c4265c0BE648F7d1D`

## Contract Details

### DWAP_Token.sol
- Standard BEP20 implementation
- Vote delegation support
- Owner burn function
- Community burn function
- Allowance-based community burn support for the burn controller
- UUPS upgradeable

### DWAP_Governor.sol
- OpenZeppelin Governor with:
  - 2-day voting delay
  - 1-week voting period
  - 4% quorum requirement
  - Majority voting rule
  - Timelock integration

### DWAP_Timelock.sol
- 2-day (172800 seconds) execution delay
- Role-based access control
- Prevents immediate proposal execution

### DWAP_BurnController.sol
- Manages community burn mechanism
- Daily burn limit configuration
- Tracks burn statistics
- Owner can update burn policies
- Upgradeable

## Token Logo Support

DWAP Token includes built-in logo support for better UX:

### Logo Functions
- `getLogoIPFS()` - Returns IPFS URI for decentralized logo
- `getLogoURI()` - Returns HTTPS gateway URI for logo
- `getTokenInfo()` - Returns complete token information including logo

### Setting Up Logo
1. Upload logo to IPFS (Pinata.cloud recommended)
2. Get CID from upload
3. Update `LOGO_IPFS` and `LOGO_URI` constants in contract
4. Redeploy or upgrade contract

**Example with CID:**
```solidity
string public constant LOGO_IPFS = "ipfs://bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae";
string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae";
```

**See**: `LOGO_SETUP_GUIDE.md` and `HOW_TO_GET_IPFS_URL.md`

## Usage Examples

### Transfer Ownership to DAO

Once Governor is deployed, transfer token ownership:

```solidity
// Call DWAP_Token.transferOwnership(DWAP_Governor_ADDRESS)
// Then accept via Governor proposal
```

### Propose DAO Action

Community members with voting power can create proposals:

```solidity
governor.propose(
  [tokenAddress],
  [0],
  [calldata],
  "Proposal description"
)
```

### Community Burn Tokens

Users can burn their tokens:

```solidity
dwapToken.communityBurn(amount);
```

## Governance Parameters

- **Voting Delay**: 48 hours (2 days)
- **Voting Period**: 1 week (604800 blocks)
- **Proposal Threshold**: 1 DWAP
- **Quorum**: 4% of total supply
- **Timelock Delay**: 2 days (172800 seconds)

## Bridge & Migration Plan

Future implementations will enable:
- ✅ Vite Network bridge
- ✅ Multi-chain compatibility
- ✅ Liquidity pools on DEXs
- ✅ DeFi integrations

## Security

- OpenZeppelin audited contracts
- UUPS upgradeable pattern
- Timelock for governance delays
- Access control via role-based system

## Testing

```bash
npm run test
```

## Verification

After deployment, verify contracts:

```bash
npm run verify -- <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Support

For questions or issues, refer to the main DWAP project documentation.
