// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DWAP Token Proxy
 * @dev UUPS Proxy for DWAP Token to enable upgrades
 */
contract DWAP_TokenProxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {}
}

/**
 * @title DWAP Burn Controller Proxy
 * @dev UUPS Proxy for Burn Controller to enable upgrades
 */
contract DWAP_BurnControllerProxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {}
}
