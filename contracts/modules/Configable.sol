// SPDX-License-Identifier: MIT
pragma solidity >=0.5.16;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

interface IConfig {
	function developer() external view returns (address);

	function platform() external view returns (address);

	function factory() external view returns (address);

	function token() external view returns (address);

	function developPercent() external view returns (uint256);

	function getPoolValue(address _pool, bytes32 key) external view returns (uint256);

	function getValue(bytes32 key) external view returns (uint256);

	function getParams(bytes32 key)
		external
		view
		returns (
			uint256
		);

	function getPoolParams(address _pool, bytes32 key)
		external
		view
		returns (
			uint256
		);

	function wallets(bytes32 key) external view returns (address);

	function setValue(bytes32 key, uint256 value) external;

	function setPoolValue(address pool, bytes32 key, uint256 value) external;

	function setParams(
		bytes32 _key,
		uint256 _min,
		uint256 _max,
		uint256 _span,
		uint256 _value
	) external;

	function setPoolParams(
		address _pool,
		bytes32 _key,
		uint256 _min,
		uint256 _max,
		uint256 _span,
		uint256 _value
	) external;

    function initPoolParams(address _pool) external;

	function isMintToken(address _token) external returns (bool);

	function prices(address _token) external returns (uint256);

	function convertTokenAmount(
		address _fromToken,
		address _toToken,
		uint256 _fromAmount
	) external view returns (uint256);

	function DAY() external view returns (uint256);

	function WETH() external view returns (address);
}

contract Configable is Initializable {
	address public config;
	address public owner;
	event OwnerChanged(address indexed _oldOwner, address indexed _newOwner);

	function __config_initialize() internal initializer {
		owner = msg.sender;
	}

	function setupConfig(address _config) external onlyOwner {
		config = _config;
		owner = IConfig(config).developer();
	}

	modifier onlyOwner() {
		require(msg.sender == owner, "OWNER FORBIDDEN");
		_;
	}

	modifier onlyDeveloper() {
		require(msg.sender == IConfig(config).developer(), "DEVELOPER FORBIDDEN");
		_;
	}

	modifier onlyPlatform() {
		require(msg.sender == IConfig(config).platform(), "PLATFORM FORBIDDEN");
		_;
	}

    modifier onlyFactory() {
        require(msg.sender == IConfig(config).factory(), 'FACTORY FORBIDDEN');
        _;
    }
}
