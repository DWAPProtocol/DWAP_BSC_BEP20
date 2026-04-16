// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

/**
 * @title DWAP BSC Deployment Guide
 * 
 * This file contains examples and best practices for deploying and interacting
 * with DWAP contracts on Binance Smart Chain (BSC).
 */

// ============================================================================
// DEPLOYMENT EXAMPLE
// ============================================================================

/**
 * Step 1: Deploy DWAP Token
 * 
 * // Deploy implementation
 * DWAP_Token impl = new DWAP_Token();
 * 
 * // Deploy proxy with initialization
 * bytes memory initData = abi.encodeCall(
 *     DWAP_Token.initialize,
 *     (owner)
 * );
 * DWAP_TokenProxy proxy = new DWAP_TokenProxy(address(impl), initData);
 * 
 * // Get token instance
 * DWAP_Token dwapToken = DWAP_Token(address(proxy));
 * 
 * Step 2: Deploy Timelock
 * 
 * address[] memory proposers = new address[](0); // Empty initially
 * address[] memory executors = new address[](1);
 * executors[0] = owner;
 * 
 * DWAP_Timelock timelock = new DWAP_Timelock(
 *     172800, // 2 days
 *     proposers,
 *     executors,
 *     owner
 * );
 * 
 * Step 3: Deploy Governor
 * 
 * DWAP_Governor governor = new DWAP_Governor(
 *     IVotes(address(dwapToken)),
 *     ITimelockController(address(timelock))
 * );
 * 
 * Step 4: Setup Timelock Roles
 * 
 * bytes32 PROPOSER_ROLE = timelock.PROPOSER_ROLE();
 * bytes32 EXECUTOR_ROLE = timelock.EXECUTOR_ROLE();
 * 
 * timelock.grantRole(PROPOSER_ROLE, address(governor));
 * timelock.grantRole(EXECUTOR_ROLE, address(0)); // Public executor
 * 
 * Step 5: Deploy Burn Controller
 * 
 * DWAP_BurnController burnImpl = new DWAP_BurnController();
 * 
 * bytes memory burnInitData = abi.encodeCall(
 *     DWAP_BurnController.initialize,
 *     (address(dwapToken), owner, 0)
 * );
 * DWAP_BurnControllerProxy burnProxy = new DWAP_BurnControllerProxy(
 *     address(burnImpl),
 *     burnInitData
 * );
 */

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * EXAMPLE 1: Transfer Tokens
 * 
 * DWAP_Token dwapToken = DWAP_Token(DWAP_TOKEN_ADDRESS);
 * 
 * uint256 amount = 1000e18; // 1000 tokens
 * dwapToken.transfer(recipientAddress, amount);
 */

/**
 * EXAMPLE 2: Setup Voting Power
 * 
 * DWAP_Token dwapToken = DWAP_Token(DWAP_TOKEN_ADDRESS);
 * 
 * // User delegates their voting power to themselves
 * dwapToken.delegate(msg.sender);
 * 
 * // User can now vote in proposals
 * uint256 votingPower = dwapToken.getVotes(msg.sender);
 */

/**
 * EXAMPLE 3: User Burns Tokens
 * 
 * DWAP_Token dwapToken = DWAP_Token(DWAP_TOKEN_ADDRESS);
 * 
 * uint256 burnAmount = 100e18; // 100 tokens
 * dwapToken.communityBurn(burnAmount);
 */

/**
 * EXAMPLE 4: Owner Burns Tokens
 * 
 * DWAP_Token dwapToken = DWAP_Token(DWAP_TOKEN_ADDRESS);
 * 
 * uint256 burnAmount = 1000e18; // 1000 tokens
 * dwapToken.ownerBurn(burnAmount); // Only owner
 */

/**
 * EXAMPLE 5: Burn via Controller
 * 
 * DWAP_BurnController burnController = DWAP_BurnController(BURN_CONTROLLER_ADDRESS);
 * 
 * uint256 burnAmount = 50e18; // 50 tokens
 * dwapToken.approve(BURN_CONTROLLER_ADDRESS, burnAmount);
 * burnController.burnTokens(burnAmount);
 */

/**
 * EXAMPLE 6: Create a Proposal
 * 
 * DWAP_Governor governor = DWAP_Governor(GOVERNOR_ADDRESS);
 * 
 * // Example: Transfer token ownership to DAO
 * address[] memory targets = new address[](1);
 * uint256[] memory values = new uint256[](1);
 * bytes[] memory calldatas = new bytes[](1);
 * 
 * targets[0] = DWAP_TOKEN_ADDRESS;
 * values[0] = 0;
 * calldatas[0] = abi.encodeCall(
 *     DWAP_Token.transferOwnership,
 *     (GOVERNOR_ADDRESS)
 * );
 * 
 * string memory description = "Transfer DWAP token ownership to DAO Governor";
 * bytes32 descriptionHash = keccak256(abi.encodePacked(description));
 * 
 * // Create proposal
 * uint256 proposalId = governor.propose(targets, values, calldatas, description);
 */

/**
 * EXAMPLE 7: Vote on Proposal
 * 
 * DWAP_Governor governor = DWAP_Governor(GOVERNOR_ADDRESS);
 * 
 * uint256 proposalId = 1;
 * uint8 support = 1; // 0 = Against, 1 = For, 2 = Abstain
 * string memory reason = "I support this proposal";
 * 
 * governor.castVoteWithReason(proposalId, support, reason);
 */

/**
 * EXAMPLE 8: Queue Proposal (Auto-queued by Governor)
 * 
 * // After voting succeeds, Governor automatically queues the proposal
 * // No manual action needed
 */

/**
 * EXAMPLE 9: Execute Proposal
 * 
 * // After 2-day timelock expires
 * DWAP_Governor governor = DWAP_Governor(GOVERNOR_ADDRESS);
 * 
 * address[] memory targets = new address[](1);
 * uint256[] memory values = new uint256[](1);
 * bytes[] memory calldatas = new bytes[](1);
 * 
 * // (Same as proposal creation)
 * 
 * bytes32 descriptionHash = keccak256(abi.encodePacked(description));
 * 
 * governor.execute(targets, values, calldatas, descriptionHash);
 */

/**
 * EXAMPLE 10: Update Burn Policy
 * 
 * DWAP_BurnController burnController = DWAP_BurnController(BURN_CONTROLLER_ADDRESS);
 * 
 * bool enabled = true;
 * uint256 dailyLimit = 1000e18; // 1000 tokens per user per day
 * uint256 minAmount = 1e18; // Minimum 1 token
 * 
 * burnController.setBurnPolicy(enabled, dailyLimit, minAmount);
 */

/**
 * EXAMPLE 11: Create Snapshot
 * 
 * DWAP_Token dwapToken = DWAP_Token(DWAP_TOKEN_ADDRESS);
 * 
 * dwapToken.snapshot(); // Only owner can call
 */

/**
 * EXAMPLE 12: Check Voting Delay
 * 
 * DWAP_Governor governor = DWAP_Governor(GOVERNOR_ADDRESS);
 * 
 * uint256 delay = governor.votingDelay();
 * // delay = 48 hours (in blocks)
 * uint256 minutesDelay = delay * 12 / 60; // ~48 hours
 */

// ============================================================================
// GOVERNANCE TIMELINE
// ============================================================================

/**
 * PROPOSAL LIFECYCLE
 * 
 * Day 1:
 * - Member creates proposal (requires 1+ DWAP)
 * - Governor records proposal
 * 
 * Day 1-3:
 * - Voting hasn't started (48-hour voting delay)
 * 
 * Day 3-10:
 * - Voting active (7-day voting period = 604800 seconds)
 * - Members vote: FOR, AGAINST, or ABSTAIN
 * - Need 4% quorum minimum
 * - Need 50%+ approval to pass
 * 
 * Day 10:
 * - Voting ends
 * - If passed, proposal queued automatically
 * - Timelock begins 2-day countdown
 * 
 * Day 10-12:
 * - Community review period
 * - Members can prepare for execution
 * 
 * Day 12:
 * - Timelock expires
 * - Anyone can call execute()
 * - Changes take effect
 */

// ============================================================================
// SECURITY CONSIDERATIONS
// ============================================================================

/**
 * 1. VOTING POWER DELEGATION
 *    - Users must call delegate() to activate voting power
 *    - Without delegation, they cannot vote
 *    - Delegation is retroactive to past blocks
 * 
 * 2. BURN CONSIDERATIONS
 *    - Burning reduces total supply permanently
 *    - Both owner and users can burn
 *    - Burned tokens cannot be recovered
 * 
 * 3. UPGRADE SAFETY
 *    - All contracts use UUPS pattern
 *    - Only owner (or DAO) can authorize upgrades
 *    - Storage layout must be compatible
 * 
 * 4. TIMELOCK PROTECTION
 *    - 2-day delay prevents flash attacks
 *    - Gives community time to react
 *    - Even DAO cannot bypass delay
 * 
 * 5. ROLE-BASED ACCESS
 *    - Proposer role: Can create proposals (Governor)
 *    - Executor role: Can execute proposals (Anyone, after delay)
 *    - Admin role: Can manage roles (Owner initially)
 */

// ============================================================================
// MIGRATION TO VITE NETWORK
// ============================================================================

/**
 * FUTURE: Bridge to Vite Network
 * 
 * Step 1: Deploy mirrored contracts on Vite
 *   - DWAP_Token_Vite (linked to BSC token)
 *   - Same governor parameters
 *   - Cross-chain voting possible
 * 
 * Step 2: Deploy bridge contract
 *   - Lock/unlock mechanism
 *   - 1:1 token representation
 *   - Security audits required
 * 
 * Step 3: Enable cross-chain governance
 *   - DAO votes on BSC
 *   - Results reflected on Vite
 *   - Synchronized state
 * 
 * Step 4: Future chains
 *   - Ethereum, Polygon, Arbitrum
 *   - Single DAO governance
 *   - Multi-chain liquidity
 */

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/**
 * □ Deploy token with correct initial supply
 * □ Verify token name, symbol, decimals
 * □ Test transfer functionality
 * □ Test burn (owner and community)
 * □ Test voting power delegation
 * □ Test Governor deployment
 * □ Test Timelock deployment
 * □ Test proposal creation
 * □ Test voting
 * □ Test timelock delay
 * □ Test proposal execution
 * □ Test burn controller
 * □ Test upgrade mechanism
 * □ Test access controls
 * □ Verify events emission
 * □ Check gas optimization
 * □ Audit contract code
 */
