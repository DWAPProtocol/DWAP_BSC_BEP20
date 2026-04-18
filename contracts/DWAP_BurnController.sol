// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDWAP {
    function balanceOf(address account) external view returns (uint256);
    function communityBurnFrom(address account, uint256 amount) external;
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title DWAP Burn Controller
 * @dev Immutable controller for community-driven DWAP token burning
 *
 * Features:
 * - Community burn with configurable daily limits per user
 * - Minimum burn amount enforcement
 * - Pausable: emergency pause for burn operations
 * - ReentrancyGuard: protection against reentrancy attacks
 * - Full burn statistics tracking
 * - Ownership transferable to DAO for decentralized governance
 * - Immutable: non-upgradeable for maximum trust
 */
contract DWAP_BurnController is Ownable, Pausable, ReentrancyGuard {

    IDWAP public immutable dwapToken;

    // Burn configurations
    bool public burnEnabled;
    uint256 public dailyBurnLimit;
    uint256 public minBurnAmount;

    // Tracking
    mapping(address => uint256) public dailyBurnedAmount;
    mapping(address => uint256) public lastBurnDay;
    uint256 public totalCommunityBurned;

    // Events
    event BurnExecuted(address indexed burner, uint256 amount);
    event BurnPolicyUpdated(bool enabled, uint256 dailyLimit, uint256 minAmount);

    constructor(
        address _dwapToken,
        address _owner,
        uint256 _dailyBurnLimit
    ) Ownable(_owner) {
        require(_dwapToken != address(0), "Invalid token address");

        dwapToken = IDWAP(_dwapToken);
        dailyBurnLimit = _dailyBurnLimit;
        burnEnabled = true;
        minBurnAmount = 1e18; // Minimum 1 DWAP
    }

    /**
     * @dev Community burn: caller burns their own tokens via the controller
     *      Caller must first approve this contract on the DWAP token.
     * @param amount Amount to burn
     */
    function burnTokens(uint256 amount) external whenNotPaused nonReentrant {
        require(burnEnabled, "Burn is currently disabled");
        require(amount >= minBurnAmount, "Amount below minimum burn");
        require(dwapToken.balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Check daily limit if set
        if (dailyBurnLimit > 0) {
            uint256 today = block.timestamp / 1 days;

            if (lastBurnDay[msg.sender] == today) {
                require(
                    dailyBurnedAmount[msg.sender] + amount <= dailyBurnLimit,
                    "Daily burn limit exceeded"
                );
                dailyBurnedAmount[msg.sender] += amount;
            } else {
                require(amount <= dailyBurnLimit, "Exceeds daily burn limit");
                dailyBurnedAmount[msg.sender] = amount;
                lastBurnDay[msg.sender] = today;
            }
        }

        dwapToken.communityBurnFrom(msg.sender, amount);
        totalCommunityBurned += amount;

        emit BurnExecuted(msg.sender, amount);
    }

    /**
     * @dev Update burn policy (owner / DAO only)
     * @param _enabled Whether burning is enabled
     * @param _dailyLimit Daily burn limit per user (0 = unlimited)
     * @param _minAmount Minimum amount to burn in one transaction
     */
    function setBurnPolicy(
        bool _enabled,
        uint256 _dailyLimit,
        uint256 _minAmount
    ) external onlyOwner {
        burnEnabled = _enabled;
        dailyBurnLimit = _dailyLimit;
        minBurnAmount = _minAmount;
        emit BurnPolicyUpdated(_enabled, _dailyLimit, _minAmount);
    }

    /**
     * @dev Pause burn operations (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause burn operations
     */
    function unpause() external onlyOwner {
        _unpause();
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
        burned = lastBurnDay[user] == today ? dailyBurnedAmount[user] : 0;
        limit = dailyBurnLimit;
        remaining = (dailyBurnLimit > 0 && dailyBurnLimit > burned)
            ? dailyBurnLimit - burned
            : 0;
    }
}
