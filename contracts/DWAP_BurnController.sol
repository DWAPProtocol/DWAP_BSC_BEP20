// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface IDWAP is IERC20 {
    function communityBurn(uint256 amount) external;
    function communityBurnFrom(address account, uint256 amount) external;
    function ownerBurn(uint256 amount) external;
}

/**
 * @title DWAP Burn Controller
 * @dev Controls burn mechanisms for the DWAP token
 * - Allows community to burn tokens through various mechanisms
 * - Tracks burn history and statistics
 * - Owner can configure burn policies
 * - Ownership can be transferred to DAO
 */
contract DWAP_BurnController is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IDWAP public dwapToken;

    // Burn configurations
    bool public burnEnabled = true;
    uint256 public dailyBurnLimit;
    uint256 public minBurnAmount = 1e18; // Minimum 1 token to burn

    // Tracking
    mapping(address => uint256) public dailyBurnedAmount;
    mapping(address => uint256) public lastBurnDay;
    uint256 public totalCommunityBurned;

    // Events
    event BurnExecuted(address indexed burner, uint256 amount, string burnType);
    event BurnPolicyUpdated(bool enabled, uint256 dailyLimit, uint256 minAmount);
    event DWAPTokenUpdated(address indexed newToken);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the Burn Controller
     * @param _dwapToken Address of DWAP token contract
     * @param _owner Owner address (can be transferred to DAO later)
     * @param _dailyBurnLimit Maximum burn per day per user (0 = unlimited)
     */
    function initialize(
        address _dwapToken,
        address _owner,
        uint256 _dailyBurnLimit
    ) public initializer {
        require(_dwapToken != address(0), "Invalid token address");
        require(_owner != address(0), "Invalid owner address");

        __Ownable_init(_owner);
        dwapToken = IDWAP(_dwapToken);
        dailyBurnLimit = _dailyBurnLimit;
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burnTokens(uint256 amount) external {
        require(burnEnabled, "Burn is currently disabled");
        require(amount >= minBurnAmount, "Amount below minimum burn");
        require(
            dwapToken.balanceOf(msg.sender) >= amount,
            "Insufficient balance"
        );

        // Check daily limit if set
        if (dailyBurnLimit > 0) {
            uint256 today = block.timestamp / 1 days;
            uint256 daysSinceLastBurn = today - lastBurnDay[msg.sender];

            if (daysSinceLastBurn == 0) {
                require(
                    dailyBurnedAmount[msg.sender] + amount <= dailyBurnLimit,
                    "Daily burn limit exceeded"
                );
                dailyBurnedAmount[msg.sender] += amount;
            } else {
                dailyBurnedAmount[msg.sender] = amount;
                lastBurnDay[msg.sender] = today;
            }
        }

        // Burn from the user's balance using their prior allowance to the controller.
        dwapToken.communityBurnFrom(msg.sender, amount);
        totalCommunityBurned += amount;

        emit BurnExecuted(msg.sender, amount, "community");
    }

    /**
     * @dev Owner burn tokens (from owner's balance)
     * @param amount Amount to burn
     */
    function ownerBurnTokens(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        dwapToken.communityBurnFrom(msg.sender, amount);
        emit BurnExecuted(msg.sender, amount, "owner");
    }

    /**
     * @dev Update burn policy
     * @param enabled Whether burning is enabled
     * @param _dailyLimit Daily burn limit per user (0 = unlimited)
     * @param _minAmount Minimum amount to burn in one transaction
     */
    function setBurnPolicy(
        bool enabled,
        uint256 _dailyLimit,
        uint256 _minAmount
    ) external onlyOwner {
        burnEnabled = enabled;
        dailyBurnLimit = _dailyLimit;
        minBurnAmount = _minAmount;

        emit BurnPolicyUpdated(enabled, _dailyLimit, _minAmount);
    }

    /**
     * @dev Update DWAP token address
     * @param newToken New token address
     */
    function setDWAPToken(address newToken) external onlyOwner {
        require(newToken != address(0), "Invalid token address");
        dwapToken = IDWAP(newToken);
        emit DWAPTokenUpdated(newToken);
    }

    /**
     * @dev Get user's daily burn status
     * @param user User address
     */
    function getDailyBurnStatus(address user)
        external
        view
        returns (uint256 burned, uint256 limit, uint256 remaining)
    {
        uint256 today = block.timestamp / 1 days;
        uint256 daysSinceLastBurn = today - lastBurnDay[user];

        burned = daysSinceLastBurn == 0 ? dailyBurnedAmount[user] : 0;
        limit = dailyBurnLimit;
        remaining = dailyBurnLimit > burned ? dailyBurnLimit - burned : 0;
    }

    /**
     * @dev Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
