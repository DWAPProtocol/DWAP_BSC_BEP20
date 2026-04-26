// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DWAP_Vesting.sol";

/**
 * @title DWAP_VestingFactory
 * @dev Deploys individual DWAP_Vesting vaults for team members, advisors,
 *      and strategic partners. Pre-funded with tokens; owned by the Timelock.
 *
 * Usage flow:
 *   1. Transfer team + advisor token allocation to this contract.
 *   2. Owner calls createVesting() (or batchCreateVesting()) per beneficiary.
 *   3. Factory deploys a DWAP_Vesting vault and transfers tokens into it.
 *   4. Each vesting vault is also owned by the Timelock (revocable for team).
 *
 * Tokenomics (suggested):
 *   • Team     — 150,000,000 DWAP  (4 yr vest, 1 yr cliff, revocable)
 *   • Advisors —  50,000,000 DWAP  (2 yr vest, 6 mo cliff, revocable)
 */
contract DWAP_VestingFactory is Ownable {
    using SafeERC20 for IERC20;

    // ── Immutables ────────────────────────────────────────────────────────────
    IERC20 public immutable token;

    // ── State ─────────────────────────────────────────────────────────────────
    address[] public allVestings;
    mapping(address => address[]) private _beneficiaryVestings;

    // ── Events ────────────────────────────────────────────────────────────────
    event VestingCreated(
        address indexed vesting,
        address indexed beneficiary,
        uint256 amount,
        uint64  start,
        uint64  cliffEnd,
        uint64  vestingEnd,
        bool    revocable
    );

    // ── Structs ───────────────────────────────────────────────────────────────
    struct VestingParams {
        address beneficiary;
        uint256 amount;        // total DWAP to vest (18-dec)
        uint64  startTime;     // unix timestamp
        uint64  cliffDuration; // seconds
        uint64  vestingDuration; // seconds (≥ cliff)
        bool    revocable;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param _token DWAP token address
     * @param _owner Timelock address (DAO-controlled)
     */
    constructor(address _token, address _owner) Ownable(_owner) {
        require(_token != address(0), "Factory: zero token");
        token = IERC20(_token);
    }

    // ── External ──────────────────────────────────────────────────────────────

    /**
     * @dev Deploy a single vesting vault. Contract must already hold enough tokens.
     * @param beneficiary     Recipient of vested tokens
     * @param amount          Total DWAP to vest
     * @param startTime       Unix timestamp vesting schedule begins
     * @param cliffDuration   Seconds before any release (≤ vestingDuration)
     * @param vestingDuration Total vesting period in seconds
     * @param revocable       Whether DAO can revoke and reclaim unvested tokens
     * @return vestingAddr    Address of the deployed DWAP_Vesting contract
     */
    function createVesting(
        address beneficiary,
        uint256 amount,
        uint64  startTime,
        uint64  cliffDuration,
        uint64  vestingDuration,
        bool    revocable
    ) public onlyOwner returns (address vestingAddr) {
        require(beneficiary   != address(0), "Factory: zero beneficiary");
        require(amount        >  0,          "Factory: zero amount");
        require(vestingDuration > 0,         "Factory: zero duration");
        require(cliffDuration <= vestingDuration, "Factory: cliff > duration");
        require(token.balanceOf(address(this)) >= amount, "Factory: insufficient balance");

        DWAP_Vesting vesting = new DWAP_Vesting(
            address(token),
            beneficiary,
            amount,
            startTime,
            cliffDuration,
            vestingDuration,
            revocable,
            owner()  // Vesting vault owned by same owner (Timelock)
        );

        vestingAddr = address(vesting);
        allVestings.push(vestingAddr);
        _beneficiaryVestings[beneficiary].push(vestingAddr);

        token.safeTransfer(vestingAddr, amount);

        emit VestingCreated(
            vestingAddr,
            beneficiary,
            amount,
            startTime,
            startTime + cliffDuration,
            startTime + vestingDuration,
            revocable
        );
    }

    /**
     * @dev Deploy multiple vesting vaults in one transaction.
     *      Caller must ensure the factory holds the sum of all amounts.
     */
    function batchCreateVesting(VestingParams[] calldata params)
        external
        onlyOwner
        returns (address[] memory vestingAddrs)
    {
        uint256 len = params.length;
        require(len > 0, "Factory: empty batch");

        vestingAddrs = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            vestingAddrs[i] = createVesting(
                params[i].beneficiary,
                params[i].amount,
                params[i].startTime,
                params[i].cliffDuration,
                params[i].vestingDuration,
                params[i].revocable
            );
        }
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /// @dev Total vesting vaults created so far.
    function totalVestings() external view returns (uint256) {
        return allVestings.length;
    }

    /// @dev All vesting vault addresses for a specific beneficiary.
    function vestingsOf(address beneficiary) external view returns (address[] memory) {
        return _beneficiaryVestings[beneficiary];
    }

    /// @dev Remaining unallocated DWAP in the factory.
    function availableBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ── Safety ────────────────────────────────────────────────────────────────

    /// @dev Reject accidental BNB sends.
    receive() external payable { revert("Factory: no BNB accepted"); }
}
