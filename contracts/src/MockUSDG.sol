// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
/// @notice Unrestricted minting for LOCAL TESTS ONLY. Not official Paxos USDG.
contract MockUSDG is ERC20 {
    constructor() ERC20("Local Mock USDG", "mUSDG") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}
