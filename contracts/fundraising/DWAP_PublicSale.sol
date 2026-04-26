// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DWAP_PublicSale
 * @dev Open public IDO for the DWAP Protocol (no whitelist required).
 *      Tokens are subject to a flat lockup period rather than a per-buyer
 *      vesting vault — maximally gas-efficient for large participant counts.
 *
 * ─── Sale Flow ───────────────────────────────────────────────────────────────
 *   1. Owner deposits DWAP tokens, then calls startSale().
 *   2. Any address calls buy(), sending BNB.
 *      → Allocation tracked; tokens stay in sale contract.
 *   3. Owner calls finalize():
 *      • Soft cap met  → FINALIZED: BNB forwarded to treasury;
 *                         unsold tokens returned to treasury.
 *      • Soft cap miss → REFUNDING: BNB stays for buyer refunds.
 *   4a. FINALIZED + lockup expired: buyers call claim() to receive DWAP.
 *   4b. REFUNDING:                   buyers call claimRefund() to recover BNB.
 *
 * ─── Lockup vs Vesting ───────────────────────────────────────────────────────
 *   Public round uses a simple global lockup (all buyers unlock at the same
 *   time = finalization + lockupDuration). Set lockupDuration = 0 for
 *   immediate claim after finalization.
 *
 * ─── Suggested Defaults (all configurable via constructor) ──────────────────
 *   • Token allocation :  75,000,000 DWAP (7.5 % of supply)
 *   • Rate             :  50,000 DWAP / BNB  ≈ $0.012 / DWAP @ $600 BNB
 *   • Hard cap         :  1,500 BNB
 *   • Soft cap         :    150 BNB
 *   • Min contribution :   0.05 BNB  per wallet  (broad access)
 *   • Max contribution :    5.0 BNB  per wallet  (anti-whale)
 *   • Lockup           :   30 days
 * ────────────────────────────────────────────────────────────────────────────
 */
contract DWAP_PublicSale is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── State machine ─────────────────────────────────────────────────────────
    enum SaleState { PENDING, ACTIVE, FINALIZED, REFUNDING }

    // ── Immutables ────────────────────────────────────────────────────────────
    IERC20  public immutable token;
    uint256 public immutable tokensPerBNB;       // DWAP per 1 BNB (both 18-dec)
    uint256 public immutable hardCapBNB;
    uint256 public immutable softCapBNB;
    uint256 public immutable minContributionBNB;
    uint256 public immutable maxContributionBNB;
    uint64  public immutable lockupDuration;     // seconds; 0 = immediate claim

    // ── Mutable state ─────────────────────────────────────────────────────────
    SaleState public saleState;
    address   public treasury;
    uint64    public claimUnlockTime;  // finalizationTime + lockupDuration

    uint256 public totalRaisedBNB;
    uint256 public totalTokensAllocated;
    uint256 public totalTokensClaimed;

    mapping(address => uint256) public contributions;    // address → BNB
    mapping(address => uint256) public tokenAllocations; // address → DWAP

    // ── Events ────────────────────────────────────────────────────────────────
    event SaleStarted();
    event TreasuryUpdated(address newTreasury);
    event Contributed(address indexed buyer, uint256 bnbAmount, uint256 tokenAmount);
    event SaleFinalized(uint256 totalBNB, address indexed treasury, uint64 unlockTime);
    event SaleEnterRefunding();
    event TokensClaimed(address indexed buyer, uint256 amount);
    event RefundClaimed(address indexed buyer, uint256 bnbAmount);
    event UnsoldReclaimed(address indexed to, uint256 tokenAmount);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param _token               DWAP token address
     * @param _tokensPerBNB        DWAP tokens per 1 BNB (e.g. 50000e18 = 50k DWAP/BNB)
     * @param _hardCapBNB          Maximum BNB to accept  (e.g. 1500e18 = 1500 BNB)
     * @param _softCapBNB          Minimum BNB for success (e.g. 150e18 = 150 BNB)
     * @param _minContributionBNB  Floor per wallet        (e.g. 0.05e18)
     * @param _maxContributionBNB  Ceiling per wallet      (e.g. 5e18)
     * @param _lockupDuration      Lockup in seconds after finalization (0 = instant)
     * @param _treasury            BNB + unsold token recipient
     * @param _owner               Initial owner (deployer or DAO Timelock)
     */
    constructor(
        address _token,
        uint256 _tokensPerBNB,
        uint256 _hardCapBNB,
        uint256 _softCapBNB,
        uint256 _minContributionBNB,
        uint256 _maxContributionBNB,
        uint64  _lockupDuration,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        require(_token    != address(0), "PublicSale: zero token");
        require(_treasury != address(0), "PublicSale: zero treasury");
        require(_tokensPerBNB      >  0, "PublicSale: zero rate");
        require(_softCapBNB <= _hardCapBNB,            "PublicSale: soft > hard cap");
        require(_minContributionBNB > 0,               "PublicSale: zero min");
        require(_minContributionBNB <= _maxContributionBNB, "PublicSale: min > max");

        token               = IERC20(_token);
        tokensPerBNB        = _tokensPerBNB;
        hardCapBNB          = _hardCapBNB;
        softCapBNB          = _softCapBNB;
        minContributionBNB  = _minContributionBNB;
        maxContributionBNB  = _maxContributionBNB;
        lockupDuration      = _lockupDuration;
        treasury            = _treasury;
        saleState           = SaleState.PENDING;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "PublicSale: zero treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause()   external onlyOwner { _pause();   }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @dev Open the sale. Requires sufficient token balance to cover hard cap.
     */
    function startSale() external onlyOwner {
        require(saleState == SaleState.PENDING, "PublicSale: already started");

        uint256 maxTokensNeeded = (hardCapBNB * tokensPerBNB) / 1e18;
        require(
            token.balanceOf(address(this)) >= maxTokensNeeded,
            "PublicSale: deposit tokens first"
        );

        saleState = SaleState.ACTIVE;
        emit SaleStarted();
    }

    /**
     * @dev End the sale and determine outcome.
     */
    function finalize() external onlyOwner {
        require(saleState == SaleState.ACTIVE, "PublicSale: not active");

        if (totalRaisedBNB >= softCapBNB) {
            saleState       = SaleState.FINALIZED;
            claimUnlockTime = uint64(block.timestamp) + lockupDuration;

            // Return unsold tokens to treasury
            uint256 unsold = token.balanceOf(address(this)) - totalTokensAllocated;
            if (unsold > 0) {
                token.safeTransfer(treasury, unsold);
                emit UnsoldReclaimed(treasury, unsold);
            }

            // Forward raised BNB to treasury
            uint256 raised = address(this).balance;
            (bool ok,) = treasury.call{value: raised}("");
            require(ok, "PublicSale: BNB transfer failed");
            emit SaleFinalized(raised, treasury, claimUnlockTime);
        } else {
            saleState = SaleState.REFUNDING;
            emit SaleEnterRefunding();
        }
    }

    /**
     * @dev After REFUNDING: reclaim DWAP tokens to treasury.
     */
    function reclaimAllTokens() external onlyOwner {
        require(saleState == SaleState.REFUNDING, "PublicSale: not refunding");
        uint256 bal = token.balanceOf(address(this));
        if (bal > 0) {
            token.safeTransfer(treasury, bal);
            emit UnsoldReclaimed(treasury, bal);
        }
    }

    // ── Buyer: Purchase ───────────────────────────────────────────────────────

    /**
     * @dev Purchase DWAP tokens. Send BNB with this call.
     *      No whitelist — open to everyone.
     */
    function buy() external payable nonReentrant whenNotPaused {
        require(saleState == SaleState.ACTIVE, "PublicSale: not active");

        uint256 bnb = msg.value;
        require(bnb >= minContributionBNB, "PublicSale: below minimum");

        uint256 newContrib = contributions[msg.sender] + bnb;
        require(newContrib <= maxContributionBNB,   "PublicSale: exceeds maximum");
        require(totalRaisedBNB + bnb <= hardCapBNB, "PublicSale: hard cap reached");

        uint256 tokenAmount = (bnb * tokensPerBNB) / 1e18;
        require(
            token.balanceOf(address(this)) - totalTokensAllocated >= tokenAmount,
            "PublicSale: insufficient tokens"
        );

        contributions[msg.sender]     = newContrib;
        tokenAllocations[msg.sender] += tokenAmount;
        totalRaisedBNB               += bnb;
        totalTokensAllocated         += tokenAmount;

        emit Contributed(msg.sender, bnb, tokenAmount);
    }

    // ── Buyer: Claim Tokens ───────────────────────────────────────────────────

    /**
     * @dev After FINALIZED + lockup elapsed: receive allocated DWAP tokens.
     */
    function claim() external nonReentrant {
        require(saleState == SaleState.FINALIZED,      "PublicSale: not finalized");
        require(block.timestamp >= claimUnlockTime,    "PublicSale: lockup active");

        uint256 allocation = tokenAllocations[msg.sender];
        require(allocation > 0, "PublicSale: nothing to claim");

        tokenAllocations[msg.sender]  = 0;
        totalTokensClaimed           += allocation;

        token.safeTransfer(msg.sender, allocation);
        emit TokensClaimed(msg.sender, allocation);
    }

    // ── Buyer: Refund ─────────────────────────────────────────────────────────

    /**
     * @dev After REFUNDING: recover contributed BNB.
     */
    function claimRefund() external nonReentrant {
        require(saleState == SaleState.REFUNDING, "PublicSale: not refunding");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "PublicSale: nothing to refund");

        contributions[msg.sender]    = 0;
        tokenAllocations[msg.sender] = 0;

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "PublicSale: refund failed");
        emit RefundClaimed(msg.sender, amount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /// @dev Tokens not yet allocated to any buyer.
    function availableTokens() external view returns (uint256) {
        return token.balanceOf(address(this)) - totalTokensAllocated;
    }

    /// @dev Whether the lockup has expired and claim() can be called.
    function isUnlocked() external view returns (bool) {
        return saleState == SaleState.FINALIZED && block.timestamp >= claimUnlockTime;
    }

    /// @dev Full sale status snapshot.
    function saleInfo() external view returns (
        SaleState _state,
        uint256   _raised,
        uint256   _hardCap,
        uint256   _softCap,
        uint256   _rate,
        uint256   _tokenBalance,
        uint256   _allocated,
        uint256   _claimed,
        uint64    _unlockTime
    ) {
        return (
            saleState,
            totalRaisedBNB,
            hardCapBNB,
            softCapBNB,
            tokensPerBNB,
            token.balanceOf(address(this)),
            totalTokensAllocated,
            totalTokensClaimed,
            claimUnlockTime
        );
    }

    // ── Safety ────────────────────────────────────────────────────────────────

    /// @dev Reject direct BNB sends — buyers must call buy().
    receive() external payable { revert("PublicSale: use buy()"); }
}
