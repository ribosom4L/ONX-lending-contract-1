// SPDX-License-Identifier: MIT
pragma solidity >=0.5.16;
import "./ERC20Token.sol";

contract AETH is ERC20Token {
	address owner;
    uint256 ratioValue;

	constructor() public ERC20Token("aETH", "aETH", 18, 10000000000000000000000000) {
		balanceOf[msg.sender] = totalSupply;
		owner = msg.sender;
        ratioValue = 911111111111111111;
	}

    function ratio() external view returns (uint256) {
        return ratioValue;
	}

    function setRatioHarness(uint256 _ratioValue) external {
        ratioValue = _ratioValue;
	}
}
