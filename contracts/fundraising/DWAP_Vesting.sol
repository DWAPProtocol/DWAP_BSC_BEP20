// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Minimal interface to activate governance delegation on DWAP token.
interface IDelegatable {
    function delegate(address delegatee) external;
}

/**
 * @title DWAP_Vesting
 * @dev Individual token vesting vault with cliff + linear release schedule.
 *
 * Vesting schedule (OpenZeppelin-compatible):
 *   t < start + cliff           → 0 tokens releasable
 *   start + cliff ≤ t < end     → totalAllocation × (t − start) / duration
 *   t ≥ start + duration        → totalAllocation (fully vested)
 *
 * Properties:
 *   • Delegates voting power to beneficiary immediately at deployment,
 *     enabling governance participation even while tokens are locked.
 *   • Revocable vestings (team / advisors): DAO can claw back unvested tokens.
 *   • Non-revocable vestings (sale participants): purely trustless.
 *   • Owner is the Timelock / DAO — not the deployer EOA.
 *
 * Deployed by:
 *   • DWAP_VestingFactory  — team, advisors, strategic partners
 *   • DWAP_PrivateSale     — private-round contributors (non-revocable)
 */
contract DWAP_Vesting is Ownable {
    using SafeERC20 for IERC20;

    // ── Immutables ────────────────────────────────────────────────────────────
    IERC20  public immutable token;
    address public immutable beneficiary;
    uint256 public immutable totalAllocation; // total tokens to vest (18-dec)
    uint64  public immutable start;           // unix timestamp vesting begins
    uint64  public immutable cliffDuration;   // seconds before first release
    uint64  public immutable duration;        // total vesting period in seconds
    bool    public immutable revocable;       // can DAO claw back unvested?

    // ── Mutable state ─────────────────────────────────────────────────────────
    uint256 public released; // cumulative tokens sent to beneficiary
    bool    public revoked;

    // ── Events ────────────────────────────────────────────────────────────────
    event Released(address indexed beneficiary, uint256 amount);
    event Revoked(uint256 releasedToBeneficiary, uint256 returnedToOwner);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param _token           DWAP token address
     * @param _beneficiary     Recipient of vested tokens
     * @param _totalAllocation Total DWAP allocated (in wei units, 1e18 = 1 DWAP)
     * @param _start           Vesting start timestamp (unix)
     * @param _cliffDuration   Seconds before any tokens become releasable
     * @param _vestingDuration Total vesting duration in seconds (≥ cliff)
     * @param _revocable       Whether DAO can reclaim unvested tokens
     * @param _owner           Ownable owner (Timelock / DAO)
     */
    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAllocation,
        uint64  _start,
        uint64  _cliffDuration,
        uint64  _vestingDuration,
        bool    _revocable,
        address _owner
    ) Ownable(_owner) {
        require(_token         != address(0), "Vesting: zero token");
        require(_beneficiary   != address(0), "Vesting: zero beneficiary");
        require(_totalAllocation > 0,         "Vesting: zero allocation");
        require(_vestingDuration > 0,         "Vesting: zero duration");
        require(_cliffDuration <= _vestingDuration, "Vesting: cliff > duration");

        token           = IERC20(_token);
        beneficiary     = _beneficiary;
        totalAllocation = _totalAllocation;
        start           = _start;
        cliffDuration   = _cliffDuration;
        duration        = _vestingDuration;
        revocable       = _revocable;

        // Activate governance voting power for the beneficiary immediately.
        // Tokens are locked but the holder can still vote/delegate.
        IDelegatable(_token).delegate(_beneficiary);
    }

    // ── External: beneficiary ─────────────────────────────────────────────────

    /**
     * @dev Release all currently vested tokens to the beneficiary.
     *      Anyone can call; tokens always go to `beneficiary`.
     */
    function release() external {
        require(!revoked, "Vesting: revoked");
        uint256 amount = releasableAmount();
        require(amount > 0, "Vesting: nothing to release");

        released += amount;
        token.safeTransfer(beneficiary, amount);
        emit Released(beneficiary, amount);
    }

    // ── External: owner (DAO / Timelock) ──────────────────────────────────────

    /**
     * @dev Revoke this vesting schedule (team / advisor only).
     *      Beneficiary receives all already-vested tokens.
     *      Remaining unvested tokens are returned to the owner (Timelock treasury).
     */
    function revoke() external onlyOwner {
        require(revocable, "Vesting: not revocable");
        require(!revoked,  "Vesting: already revoked");
        revoked = true;

        uint256 vestedNow = releasableAmount();
        if (vestedNow > 0) {
            released += vestedNow;
            token.safeTransfer(beneficiary, vestedNow);
            emit Released(beneficiary, vestedNow);
        }

        uint256 remainder = token.balanceOf(address(this));
        if (remainder > 0) {
            token.safeTransfer(owner(), remainder);
        }
        emit Revoked(vestedNow, remainder);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /**
     * @dev Total tokens vested as of now (includes already-released).
     */
    function vestedAmount() public view returns (uint256) {
        return _vestedAt(uint64(block.timestamp));
    }

    /**
     * @dev Tokens currently unlocked and not yet released.
     */
    function releasableAmount() public view returns (uint256) {
        return _vestedAt(uint64(block.timestamp)) - released;
    }

    /**
     * @dev Full status snapshot — convenient for dashboards / UIs.
     */
    function vestingInfo() external view returns (
        address _beneficiary,
        uint256 _totalAlloc,
        uint64  _start,
        uint64  _cliffEnd,
        uint64  _vestingEnd,
        uint256 _vested,
        uint256 _released,
        uint256 _releasable,
        bool    _revocable,
        bool    _revoked
    ) {
        return (
            beneficiary,
            totalAllocation,
            start,
            start + cliffDuration,
            start + duration,
            vestedAmount(),
            released,
            releasableAmount(),
            revocable,
            revoked
        );
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _vestedAt(uint64 ts) internal view returns (uint256) {
        if (ts < start + cliffDuration) return 0;
        if (ts >= start + duration)     return totalAllocation;
        // Linear interpolation from `start` (not from cliff-end).
        // At cliff-end, beneficiary can claim (cliff / duration) × total.
        return (totalAllocation * (ts - start)) / duration;
    }

    // ── Safety ────────────────────────────────────────────────────────────────

    /// @dev Reject accidental BNB sends.
    receive() external payable { revert("Vesting: no BNB accepted"); }
}
