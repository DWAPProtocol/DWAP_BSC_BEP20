// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title DWAP Timelock
 * @dev TimelockController for DWAP DAO governance
 * - 2-day (172800 seconds) delay for proposals
 * - Prevents immediate execution of proposals
 * - Allows DAO members time to review and react
 */
contract DWAP_Timelock is TimelockController {
    /**
     * @dev Constructor for DWAP Timelock
     * @param minDelay Minimum delay between proposal and execution (2 days = 172800 seconds)
     * @param proposers Array of proposer addresses
     * @param executors Array of executor addresses
     * @param admin Admin address (can manage roles)
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
