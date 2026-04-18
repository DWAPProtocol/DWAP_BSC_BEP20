// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DWAP Token
 * @dev Immutable governance token for decentralized Web3 infrastructure on BSC
 *
 * Features:
 * - Max Supply: 1,000,000,000 (1B) — fixed at deployment, no minting
 * - Deflationary: burnable by both owner and community with full tracking
 * - Votes: integrated ERC20Votes for on-chain DAO governance
 * - Pausable: emergency pause mechanism (owner / DAO)
 * - Permit: gasless approvals via EIP-2612
 * - Token Recovery: rescue ERC20 tokens sent by mistake
 * - Immutable: non-upgradeable for maximum trust & decentralization
 */
contract DWAP_Token is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    ERC20Votes,
    Ownable
{
    using SafeERC20 for IERC20;

    uint256 public constant MAX_SUPPLY = 1_000_000_000e18;
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000e18;

    // Burn tracking
    uint256 public totalBurnedByOwner;
    uint256 public totalBurnedByUsers;
    mapping(address => uint256) public userBurnedAmount;

    // Token metadata
    string public constant LOGO_IPFS = "ipfs://bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae";
    string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae";
    string public constant WEBSITE = "https://dwap-token.com";
    string public constant DESCRIPTION = "DWAP is a governance token for decentralized Web3 infrastructure on BSC";

    // Events
    event BurnedByOwner(uint256 amount);
    event BurnedByUser(address indexed user, uint256 amount);
    event TokensRecovered(address indexed token, address indexed to, uint256 amount);

    constructor(address initialOwner)
        ERC20("DWAP Token", "DWAP")
        ERC20Permit("DWAP Token")
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    // ==================== Burn Functions ====================

    /**
     * @dev Owner can burn tokens from their own balance
     * @param amount Amount of tokens to burn
     */
    function ownerBurn(uint256 amount) external onlyOwner {
        require(amount > 0, "DWAP: burn amount must be > 0");
        _burn(msg.sender, amount);
        totalBurnedByOwner += amount;
        emit BurnedByOwner(amount);
    }

    /**
     * @dev Community members can burn their own tokens
     * @param amount Amount of tokens to burn
     */
    function communityBurn(uint256 amount) external {
        require(amount > 0, "DWAP: burn amount must be > 0");
        _burn(msg.sender, amount);
        totalBurnedByUsers += amount;
        userBurnedAmount[msg.sender] += amount;
        emit BurnedByUser(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from an approved account (community burn accounting)
     * @param account Account whose tokens will be burned
     * @param amount Amount of tokens to burn
     */
    function communityBurnFrom(address account, uint256 amount) external {
        require(account != address(0), "DWAP: invalid account");
        require(amount > 0, "DWAP: burn amount must be > 0");
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        totalBurnedByUsers += amount;
        userBurnedAmount[account] += amount;
        emit BurnedByUser(account, amount);
    }

    // ==================== Pause Functions ====================

    /**
     * @dev Pause all token transfers (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== Token Recovery ====================

    /**
     * @dev Recover ERC20 tokens accidentally sent to this contract
     * @param tokenAddress The token contract address to recover
     * @param amount Amount to recover
     */
    function recoverERC20(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(this), "DWAP: cannot recover own tokens");
        IERC20(tokenAddress).safeTransfer(owner(), amount);
        emit TokensRecovered(tokenAddress, owner(), amount);
    }

    // ==================== View Functions ====================

    function getLogoIPFS() external pure returns (string memory) {
        return LOGO_IPFS;
    }

    function getLogoURI() external pure returns (string memory) {
        return LOGO_URI;
    }

    /**
     * @dev Get complete token information
     */
    function getTokenInfo() external view returns (
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_,
        string memory logoURI_,
        string memory website_,
        string memory description_
    ) {
        return (name(), symbol(), decimals(), totalSupply(), LOGO_URI, WEBSITE, DESCRIPTION);
    }

    // ==================== Internal Overrides ====================

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address tokenOwner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(tokenOwner);
    }
}
