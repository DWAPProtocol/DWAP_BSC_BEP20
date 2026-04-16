// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title DWAP Token
 * @dev DWAP is a governance token for decentralized Web3 infrastructure
 * - Max Supply: 1,000,000,000 (1B)
 * - Initial Total Supply: 1,000,000,000 (1B)
 * - Burnable: both by owner and community
 * - Votes: integrated voting power delegation
 * - Upgradeable: using UUPS proxy pattern
 * - DAO Governance: ownership can be transferred to DAO
 */
contract DWAP_Token is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20VotesUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    uint256 public constant MAX_SUPPLY = 1_000_000_000e18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000e18; // 1 billion tokens

    // Burn tracking
    uint256 public totalBurnedByOwner;
    uint256 public totalBurnedByUsers;
    mapping(address => uint256) public userBurnedAmount;

    // Token metadata
    string public constant LOGO_IPFS = "ipfs://bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae"; // Replace with actual CID
    string public constant LOGO_URI = "https://gateway.pinata.cloud/ipfs/bafkreiadnn7px3hxm5koqnvtv4lwew4xrdz7w76rl477jcp3oz7rt6svae"; // Replace with actual CID
    string public constant WEBSITE = "https://dwap-token.com"; // Replace with actual website
    string public constant DESCRIPTION = "DWAP is a governance token for decentralized Web3 infrastructure on BSC";

    // Events
    event BurnedByOwner(uint256 amount);
    event BurnedByUser(address indexed user, uint256 amount);
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the DWAP token with initial supply to the owner
     * @param initialOwner The address that will own the token initially
     */
    function initialize(address initialOwner) public initializer {
        __ERC20_init("DWAP Token", "DWAP");
        __ERC20Burnable_init();
        __ERC20Votes_init();
        __Ownable_init(initialOwner);

        // Mint entire initial supply to the owner
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev Owner can burn tokens from their own balance
     * @param amount Amount of tokens to burn
     */
    function ownerBurn(uint256 amount) external onlyOwner {
        require(amount > 0, "DWAP: burn amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "DWAP: insufficient balance");

        _burn(msg.sender, amount);
        totalBurnedByOwner += amount;

        emit BurnedByOwner(amount);
    }

    /**
     * @dev Community members can burn their tokens
     * @param amount Amount of tokens to burn
     */
    function communityBurn(uint256 amount) external {
        require(amount > 0, "DWAP: burn amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "DWAP: insufficient balance");

        _burn(msg.sender, amount);
        totalBurnedByUsers += amount;
        userBurnedAmount[msg.sender] += amount;

        emit BurnedByUser(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from an approved account while preserving community burn accounting.
     * @param account Account whose tokens will be burned
     * @param amount Amount of tokens to burn
     */
    function communityBurnFrom(address account, uint256 amount) external {
        require(account != address(0), "DWAP: invalid account");
        require(amount > 0, "DWAP: burn amount must be greater than 0");
        require(balanceOf(account) >= amount, "DWAP: insufficient balance");

        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        totalBurnedByUsers += amount;
        userBurnedAmount[account] += amount;

        emit BurnedByUser(account, amount);
    }

    /**
     * @dev Get token logo via IPFS
     * @return IPFS URI for the token logo
     */
    function getLogoIPFS() external pure returns (string memory) {
        return LOGO_IPFS;
    }

    /**
     * @dev Get token logo via HTTPS gateway
     * @return HTTPS URI for the token logo
     */
    function getLogoURI() external pure returns (string memory) {
        return LOGO_URI;
    }

    /**
     * @dev Get complete token information
    * @return name_ Token name
    * @return symbol_ Token symbol
    * @return decimals_ Token decimals
    * @return totalSupply_ Current total supply
    * @return logoURI_ HTTPS logo URI
    * @return website_ Project website
    * @return description_ Project description
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
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            LOGO_URI,
            WEBSITE,
            DESCRIPTION
        );
    }

    /**
     * @dev Authorize an upgrade to a new implementation
     * Only callable by owner
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ==================== Internal Override Functions ====================

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20VotesUpgradeable) {
        super._update(from, to, amount);
    }

}
