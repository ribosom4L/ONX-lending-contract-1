// SPDX-License-Identifier: MIT
pragma solidity >=0.5.16;
import "./ONX.sol";
import "./modules/Configable.sol";

interface IONXPool {
	function init(address supplyToken, address collateralToken) external;

	function setupConfig(address config) external;
}

contract ONXFactory is Configable {
	event PoolCreated(address indexed lendToken, address indexed collateralToken, address indexed pool);
	address[] public allPools;
	mapping(address => bool) public isPool;
	mapping(address => mapping(address => address)) public getPool;

	function initialize() public initializer {
		Configable.__config_initialize();
	}

//	function createPool(address _lendToken, address _collateralToken) external returns (address pool) {
//		require(getPool[_lendToken][_collateralToken] == address(0), "ALREADY CREATED");
//		bytes32 salt = keccak256(abi.encodePacked(_lendToken, _collateralToken));
//		bytes memory bytecode = type(ONXPool).creationCode;
//		assembly {
//			pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
//		}
//		getPool[_lendToken][_collateralToken] = pool;
//		allPools.push(pool);
//		isPool[pool] = true;
//		IConfig(config).initPoolParams(pool);
//		IONXPool(pool).setupConfig(config);
//		IONXPool(pool).init(_lendToken, _collateralToken);
//		emit PoolCreated(_lendToken, _collateralToken, pool);
//		return pool;
//	}

	function createPool(address pool, address _lendToken, address _collateralToken) external {
		require(getPool[_lendToken][_collateralToken] == address(0), "ALREADY CREATED");
		getPool[_lendToken][_collateralToken] = pool;
		allPools.push(pool);
		isPool[pool] = true;
		IConfig(config).initPoolParams(pool);
		IONXPool(pool).setupConfig(config);
		IONXPool(pool).init(_lendToken, _collateralToken);
		emit PoolCreated(_lendToken, _collateralToken, pool);
	}

	function countPools() external view returns (uint256) {
		return allPools.length;
	}
}
