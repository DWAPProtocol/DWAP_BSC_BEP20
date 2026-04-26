// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./DWAP_Vesting.sol";

/**
 * @title DWAP_PrivateSale
 * @dev Merkle-whitelisted private / seed round for the DWAP Protocol.
 *      Each contributor receives their own non-revocable DWAP_Vesting vault.
 *
 * ─── Sale Flow ───────────────────────────────────────────────────────────────
 *   1. Owner deposits DWAP tokens and sets Merkle root (whitelist).
 *   2. Owner calls startSale().
 *   3. Whitelisted addresses call buy(proof) sending BNB.
 *      → Allocation tracked; tokens stay in sale contract.
 *   4. Owner calls finalize():
 *      • Soft cap met  → FINALIZED: BNB forwarded to treasury;
 *                         unsold tokens returned to treasury.
 *      • Soft cap miss → REFUNDING: BNB stays for buyer refunds.
 *   5a. FINALIZED: Each buyer calls claimVesting() to deploy their personal
 *       DWAP_Vesting vault and receive their locked tokens.
 *   5b. REFUNDING:  Each buyer calls claimRefund() to recover their BNB.
 *
 * ─── Suggested Defaults (all configurable via constructor) ──────────────────
 *   • Token allocation : 100,000,000 DWAP (10 % of supply)
 *   • Rate             : 100,000 DWAP / BNB  ≈ $0.006 / DWAP @ $600 BNB
 *   • Hard cap         :  1,000 BNB
 *   • Soft cap         :    100 BNB
 *   • Min contribution :   0.1 BNB  per wallet
 *   • Max contribution :  20.0 BNB  per wallet
 *   • Vesting cliff    :  90 days
 *   • Vesting duration : 365 days
 * ────────────────────────────────────────────────────────────────────────────
 */
contract DWAP_PrivateSale is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── State machine ─────────────────────────────────────────────────────────
    enum SaleState { PENDING, ACTIVE, FINALIZED, REFUNDING }

    // ── Immutables ────────────────────────────────────────────────────────────
    IERC20  public immutable token;
    uint256 public immutable tokensPerBNB;       // DWAP per 1 BNB (both 18-dec)
    uint256 public immutable hardCapBNB;          // maximum BNB to raise
    uint256 public immutable softCapBNB;          // minimum BNB for success
    uint256 public immutable minContributionBNB;  // per-wallet floor
    uint256 public immutable maxContributionBNB;  // per-wallet ceiling
    uint64  public immutable vestingCliff;        // seconds
    uint64  public immutable vestingDuration;     // seconds (≥ cliff)

    // ── Mutable state ─────────────────────────────────────────────────────────
    SaleState public saleState;
    bytes32   public merkleRoot;
    address   public treasury;
    uint64    public vestingStart;        // set at finalization (same for all buyers)

    uint256 public totalRaisedBNB;
    uint256 public totalTokensAllocated;  // DWAP promised to buyers
    uint256 public totalTokensClaimed;    // DWAP transferred to vesting vaults

    mapping(address => uint256) public contributions;    // address → BNB contributed
    mapping(address => uint256) public tokenAllocations; // address → DWAP allocated
    mapping(address => address) public vestingOf;        // address → vesting vault

    // ── Events ────────────────────────────────────────────────────────────────
    event SaleStarted();
    event MerkleRootSet(bytes32 root);
    event TreasuryUpdated(address newTreasury);
    event Contributed(address indexed buyer, uint256 bnbAmount, uint256 tokenAmount);
    event SaleFinalized(uint256 totalBNB, address indexed treasury);
    event SaleEnterRefunding();
    event VestingClaimed(address indexed buyer, address indexed vestingContract, uint256 amount);
    event RefundClaimed(address indexed buyer, uint256 bnbAmount);
    event UnsoldReclaimed(address indexed to, uint256 tokenAmount);

    // ── Constructor ───────────────────────────────────────────────────────────
    /**
     * @param _token               DWAP token address
     * @param _tokensPerBNB        DWAP tokens per 1 BNB (e.g. 100000e18 = 100k DWAP/BNB)
     * @param _hardCapBNB          Maximum BNB to accept  (e.g. 1000e18 = 1000 BNB)
     * @param _softCapBNB          Minimum BNB for success (e.g. 100e18 = 100 BNB)
     * @param _minContributionBNB  Floor per wallet        (e.g. 0.1e18 = 0.1 BNB)
     * @param _maxContributionBNB  Ceiling per wallet      (e.g. 20e18 = 20 BNB)
     * @param _vestingCliff        Cliff in seconds        (e.g. 90 days)
     * @param _vestingDuration     Total vesting in seconds (e.g. 365 days)
     * @param _treasury            BNB + unsold token recipient
     * @param _owner               Initial owner (typically deployer, later DAO)
     */
    constructor(
        address _token,
        uint256 _tokensPerBNB,
        uint256 _hardCapBNB,
        uint256 _softCapBNB,
        uint256 _minContributionBNB,
        uint256 _maxContributionBNB,
        uint64  _vestingCliff,
        uint64  _vestingDuration,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        require(_token    != address(0), "PrivateSale: zero token");
        require(_treasury != address(0), "PrivateSale: zero treasury");
        require(_tokensPerBNB      >  0, "PrivateSale: zero rate");
        require(_softCapBNB <= _hardCapBNB,            "PrivateSale: soft > hard cap");
        require(_minContributionBNB > 0,               "PrivateSale: zero min");
        require(_minContributionBNB <= _maxContributionBNB, "PrivateSale: min > max");
        require(_vestingDuration   > 0,                "PrivateSale: zero vesting");
        require(_vestingCliff <= _vestingDuration,     "PrivateSale: cliff > duration");

        token               = IERC20(_token);
        tokensPerBNB        = _tokensPerBNB;
        hardCapBNB          = _hardCapBNB;
        softCapBNB          = _softCapBNB;
        minContributionBNB  = _minContributionBNB;
        maxContributionBNB  = _maxContributionBNB;
        vestingCliff        = _vestingCliff;
        vestingDuration     = _vestingDuration;
        treasury            = _treasury;
        saleState           = SaleState.PENDING;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @dev Set the Merkle root for whitelist verification.
     *      Generate off-chain using the OZ StandardMerkleTree library (double-hash leaves).
     */
    function setMerkleRoot(bytes32 _root) external onlyOwner {
        require(
            saleState == SaleState.PENDING || saleState == SaleState.ACTIVE,
            "PrivateSale: sale ended"
        );
        merkleRoot = _root;
        emit MerkleRootSet(_root);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "PrivateSale: zero treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause()   external onlyOwner { _pause();   }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @dev Open the sale. Requires Merkle root and sufficient token balance
     *      to cover the full hard cap at the configured rate.
     */
    function startSale() external onlyOwner {
        require(saleState   == SaleState.PENDING, "PrivateSale: already started");
        require(merkleRoot  != bytes32(0),         "PrivateSale: no merkle root");

        uint256 maxTokensNeeded = (hardCapBNB * tokensPerBNB) / 1e18;
        require(
            token.balanceOf(address(this)) >= maxTokensNeeded,
            "PrivateSale: deposit tokens first"
        );

        saleState = SaleState.ACTIVE;
        emit SaleStarted();
    }

    /**
     * @dev End the sale and determine outcome.
     *      • Soft cap met  → FINALIZED: forward BNB + return unsold tokens.
     *      • Soft cap miss → REFUNDING: buyers reclaim BNB.
     */
    function finalize() external onlyOwner {
        require(saleState == SaleState.ACTIVE, "PrivateSale: not active");

        if (totalRaisedBNB >= softCapBNB) {
            saleState    = SaleState.FINALIZED;
            vestingStart = uint64(block.timestamp);

            // Return unsold tokens to treasury immediately
            uint256 unsold = token.balanceOf(address(this)) - totalTokensAllocated;
            if (unsold > 0) {
                token.safeTransfer(treasury, unsold);
                emit UnsoldReclaimed(treasury, unsold);
            }

            // Forward all BNB raised to treasury
            uint256 raised = address(this).balance;
            (bool ok,) = treasury.call{value: raised}("");
            require(ok, "PrivateSale: BNB transfer failed");
            emit SaleFinalized(raised, treasury);
        } else {
            saleState = SaleState.REFUNDING;
            emit SaleEnterRefunding();
        }
    }

    /**
     * @dev After REFUNDING: reclaim all DWAP tokens to treasury
     *      (buyers already receive full BNB refunds).
     */
    function reclaimAllTokens() external onlyOwner {
        require(saleState == SaleState.REFUNDING, "PrivateSale: not refunding");
        uint256 bal = token.balanceOf(address(this));
        if (bal > 0) {
            token.safeTransfer(treasury, bal);
            emit UnsoldReclaimed(treasury, bal);
        }
    }

    // ── Buyer: Purchase ───────────────────────────────────────────────────────

    /**
     * @dev Purchase DWAP tokens by sending BNB.
     *      Allocation is recorded; vesting vault is deployed later via claimVesting().
     * @param proof Merkle proof that msg.sender is whitelisted
     */
    function buy(bytes32[] calldata proof) external payable nonReentrant whenNotPaused {
        require(saleState == SaleState.ACTIVE, "PrivateSale: not active");
        require(_verifyWhitelist(proof, msg.sender), "PrivateSale: not whitelisted");

        uint256 bnb = msg.value;
        require(bnb >= minContributionBNB, "PrivateSale: below minimum");

        uint256 newContrib = contributions[msg.sender] + bnb;
        require(newContrib <= maxContributionBNB,  "PrivateSale: exceeds maximum");
        require(totalRaisedBNB + bnb <= hardCapBNB, "PrivateSale: hard cap reached");

        uint256 tokenAmount = (bnb * tokensPerBNB) / 1e18;
        require(
            token.balanceOf(address(this)) - totalTokensAllocated >= tokenAmount,
            "PrivateSale: insufficient tokens"
        );

        contributions[msg.sender]     = newContrib;
        tokenAllocations[msg.sender] += tokenAmount;
        totalRaisedBNB               += bnb;
        totalTokensAllocated         += tokenAmount;

        emit Contributed(msg.sender, bnb, tokenAmount);
    }

    // ── Buyer: Claim Vesting ──────────────────────────────────────────────────

    /**
     * @dev After FINALIZED: deploy a personal DWAP_Vesting vault.
     *      Vesting starts at the moment the sale was finalized (same for all buyers).
     *      Caller pays gas for vault deployment (~300k gas, one-time).
     */
    function claimVesting() external nonReentrant {
        require(saleState == SaleState.FINALIZED,      "PrivateSale: not finalized");
        require(vestingOf[msg.sender] == address(0),   "PrivateSale: already claimed");

        uint256 allocation = tokenAllocations[msg.sender];
        require(allocation > 0, "PrivateSale: no allocation");

        tokenAllocations[msg.sender]  = 0;
        totalTokensClaimed           += allocation;

        DWAP_Vesting vesting = new DWAP_Vesting(
            address(token),
            msg.sender,
            allocation,
            vestingStart,    // same start for all buyers = finalization timestamp
            vestingCliff,
            vestingDuration,
            false,           // non-revocable — sale participants always keep vested tokens
            owner()
        );

        address vestingAddr = address(vesting);
        vestingOf[msg.sender] = vestingAddr;

        token.safeTransfer(vestingAddr, allocation);
        emit VestingClaimed(msg.sender, vestingAddr, allocation);
    }

    // ── Buyer: Refund ─────────────────────────────────────────────────────────

    /**
     * @dev After REFUNDING: recover contributed BNB. Token allocation is forfeited.
     */
    function claimRefund() external nonReentrant {
        require(saleState == SaleState.REFUNDING, "PrivateSale: not refunding");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "PrivateSale: nothing to refund");

        contributions[msg.sender]    = 0;
        tokenAllocations[msg.sender] = 0;

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "PrivateSale: refund failed");
        emit RefundClaimed(msg.sender, amount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /// @dev Tokens not yet allocated to any buyer.
    function availableTokens() external view returns (uint256) {
        return token.balanceOf(address(this)) - totalTokensAllocated;
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
        uint256   _claimed
    ) {
        return (
            saleState,
            totalRaisedBNB,
            hardCapBNB,
            softCapBNB,
            tokensPerBNB,
            token.balanceOf(address(this)),
            totalTokensAllocated,
            totalTokensClaimed
        );
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /**
     * @dev Verify a Merkle proof against the configured root.
     *      Leaf format: keccak256(bytes.concat(keccak256(abi.encode(addr))))
     *      — compatible with OpenZeppelin StandardMerkleTree (double-hash leaves).
     */
    function _verifyWhitelist(bytes32[] calldata proof, address addr)
        internal view returns (bool)
    {
        if (merkleRoot == bytes32(0)) return false;
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr))));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    // ── Safety ────────────────────────────────────────────────────────────────

    /// @dev Reject direct BNB sends — contributors must call buy().
    receive() external payable { revert("PrivateSale: use buy()"); }
}
