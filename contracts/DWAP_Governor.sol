// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title DWAP Governor
 * @dev OpenZeppelin Governor implementation for DWAP DAO
 *
 * Governance parameters:
 * - 2-day voting delay (48 hours) before voting starts
 * - 1-week voting period (7 days)
 * - 4% quorum required (of total voting power)
 * - 1,000,000 DWAP proposal threshold (anti-spam)
 * - 2-day timelock delay before execution
 * - Proposal fee: burned on submission to prevent spam
 * - All settings changeable by governance proposals
 */
contract DWAP_Governor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    ERC20Burnable public immutable feeToken;
    uint256 public proposalFee;

    event ProposalFeeUpdated(uint256 oldFee, uint256 newFee);
    event ProposalFeeBurned(uint256 indexed proposalId, address indexed proposer, uint256 fee);

    /**
     * @dev Constructor for DWAP Governor
     * @param _token DWAP token contract (also used for proposal fee burning)
     * @param _timelock Timelock controller contract
     * @param _proposalFee Initial proposal fee in DWAP (burned on propose)
     */
    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _proposalFee
    )
        Governor("DWAP_Governor")
        GovernorSettings(
            57600,           // 2-day voting delay  (48h × 3600s ÷ 3s/block = 57,600 blocks @ BSC)
            201600,          // 1-week voting period (7d × 86400s ÷ 3s/block = 201,600 blocks @ BSC)
            1_000_000e18     // 1M DWAP proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {
        feeToken = ERC20Burnable(address(_token));
        proposalFee = _proposalFee;
    }

    /**
     * @dev Update proposal fee (governance only — via timelock)
     * @param newFee New fee amount in DWAP tokens
     */
    function setProposalFee(uint256 newFee) external onlyGovernance {
        uint256 oldFee = proposalFee;
        proposalFee = newFee;
        emit ProposalFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Override propose to charge & burn a proposal fee
     *      Proposer must approve Governor for the fee amount before calling.
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor) returns (uint256) {
        // Threshold check happens inside super.propose
        uint256 proposalId = super.propose(targets, values, calldatas, description);

        // Burn proposal fee after successful proposal creation
        if (proposalFee > 0) {
            feeToken.burnFrom(msg.sender, proposalFee);
            emit ProposalFeeBurned(proposalId, msg.sender, proposalFee);
        }

        return proposalId;
    }

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorumNumerator()
        public
        view
        override(GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorumNumerator();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
