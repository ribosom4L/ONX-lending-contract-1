// SPDX-License-Identifier: MIT
pragma solidity >=0.5.16;
import "./libraries/SafeMath.sol";
import "./modules/ConfigNames.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

interface IERC20 {
	function balanceOf(address owner) external view returns (uint256);

	function decimals() external view returns (uint8);
}

interface IONXPool {
	function collateralToken() external view returns (address);
}

interface IAETH {
	function ratio() external view returns (uint256);
}

contract ONXConfig is Initializable {
	using SafeMath for uint256;
	using SafeMath for uint8;
	address public owner;
	address public platform;
	address public developer;
	address public factory;
	address public token;
	address public WETH;
	uint256 public lastPriceBlock;
	uint256 public DAY = 6400;
	uint256 public HOUR = 267;
	
	mapping(address => mapping(bytes32 => uint256)) public poolParams;
	mapping(bytes32 => uint256) public params;
	mapping(bytes32 => address) public wallets;
	mapping(address => uint256) public prices;
	event PriceChange(address token, uint256 value);
	event ParameterChange(bytes32 key, uint256 value);
	event PoolParameterChange(bytes32 key, uint256 value);

	constructor() public {
		owner = msg.sender;
		developer = msg.sender;
		uint256 id;
		assembly {
			id := chainid()
		}
		if (id != 1) {
			DAY = 28800;
			HOUR = 1200;
		}
	}

	function initialize(
		address _platform,
		address _factory,
		address _token,
		address _WETH
	) external initializer {
		require(msg.sender == owner || msg.sender == developer, "ONX: Config FORBIDDEN");
		platform = _platform;
		factory = _factory;
		token = _token;
		WETH = _WETH;

		initParameter();
	}

	function changeDeveloper(address _developer) external {
		require(msg.sender == owner || msg.sender == developer, "ONX: Config FORBIDDEN");
		developer = _developer;
	}

	function setWallets(bytes32[] calldata _names, address[] calldata _wallets) external {
		require(msg.sender == owner || msg.sender == developer, "ONX: ONLY DEVELOPER");
		require(_names.length == _wallets.length, "ONX: WALLETS LENGTH MISMATCH");
		for (uint256 i = 0; i < _names.length; i++) {
			wallets[_names[i]] = _wallets[i];
		}
	}

	function initParameter() internal {
		require(msg.sender == owner || msg.sender == developer, "ONX: Config FORBIDDEN");
		_setParams(ConfigNames.STAKE_LOCK_TIME, 0);
		_setParams(ConfigNames.CHANGE_PRICE_DURATION, 0);
		_setParams(ConfigNames.CHANGE_PRICE_PERCENT, 20);
		_setParams(ConfigNames.DEPOSIT_ENABLE, 1);
		_setParams(ConfigNames.WITHDRAW_ENABLE, 1);
		_setParams(ConfigNames.BORROW_ENABLE, 1);
		_setParams(ConfigNames.REPAY_ENABLE, 1);
		_setParams(ConfigNames.LIQUIDATION_ENABLE, 1);
		_setParams(ConfigNames.REINVEST_ENABLE, 1);
		_setParams(ConfigNames.POOL_REWARD_RATE, 5e16);
		_setParams(ConfigNames.POOL_ARBITRARY_RATE, 9e16);
	}

	function initPoolParams(address _pool) external {
			require(msg.sender == factory, "Config FORBIDDEN");
			_setPoolParams(_pool, ConfigNames.POOL_BASE_INTERESTS, 2e17);
			_setPoolParams(_pool, ConfigNames.POOL_MARKET_FRENZY, 2e17);
			_setPoolParams(_pool, ConfigNames.POOL_PLEDGE_RATE, 6e17);
			_setPoolParams(_pool, ConfigNames.POOL_LIQUIDATION_RATE, 9e17);
			_setPoolParams(_pool, ConfigNames.POOL_MINT_POWER, 10000);
			_setPoolParams(_pool, ConfigNames.POOL_MINT_BORROW_PERCENT, 5000);
	}

	function _setPoolValue(address _pool, bytes32 _key, uint256 _value) internal {
		poolParams[_pool][_key] = _value;
		emit PoolParameterChange(_key, _value);
	}

	function _setParams(
		bytes32 _key,
		uint256 _value
	) internal {
		params[_key] = _value;
		emit ParameterChange(_key, _value);
	}

	function _setPoolParams(
		address _pool,
		bytes32 _key,
		uint256 _value
	) internal {
		poolParams[_pool][_key] = _value;
		emit PoolParameterChange(_key, _value);
	}

	function _setPrice(address _token, uint256 _value) internal {
		prices[_token] = _value;
		emit PriceChange(_token, _value);
	}

	function setTokenPrice(address[] calldata _tokens, uint256[] calldata _prices) external {
		uint256 duration = params[ConfigNames.CHANGE_PRICE_DURATION];
		uint256 maxPercent = params[ConfigNames.CHANGE_PRICE_PERCENT];
		require(block.number >= lastPriceBlock.add(duration), "ONX: Price Duration");
		require(msg.sender == wallets[bytes32("price")], "ONX: Config FORBIDDEN");
		require(_tokens.length == _prices.length, "ONX: PRICES LENGTH MISMATCH");
		for (uint256 i = 0; i < _tokens.length; i++) {
			if (prices[_tokens[i]] == 0) {
				_setPrice(_tokens[i], _prices[i]);
			} else {
				uint256 currentPrice = prices[_tokens[i]];
				if (_prices[i] > currentPrice) {
					uint256 maxPrice = currentPrice.add(currentPrice.mul(maxPercent).div(10000));
					_setPrice(_tokens[i], _prices[i] > maxPrice ? maxPrice : _prices[i]);
				} else {
					uint256 minPrice = currentPrice.sub(currentPrice.mul(maxPercent).div(10000));
					_setPrice(_tokens[i], _prices[i] < minPrice ? minPrice : _prices[i]);
				}
			}
		}

		lastPriceBlock = block.number;
	}

	function setValue(bytes32 _key, uint256 _value) external {
		require(
			msg.sender == owner,
			"ONX: ONLY DEVELOPER"
		);
		params[_key] = _value;
		emit ParameterChange(_key, _value);
	}

	function setPoolValue(address _pool, bytes32 _key, uint256 _value) external {
		require(
			msg.sender == owner || msg.sender == platform,
			"ONX: FORBIDDEN"
		);
		_setPoolValue(_pool, _key, _value);
	}

	function getValue(bytes32 _key) external view returns (uint256) {
		return params[_key];
	}

	function getPoolValue(address _pool, bytes32 _key) external view returns (uint256) {
		return poolParams[_pool][_key];
	}

	function setParams(
		bytes32 _key,
		uint256 _value
	) external {
		require(
			msg.sender == owner || msg.sender == developer,
			"ONX: FORBIDDEN"
		);
		_setParams(_key, _value);
	}

	function setPoolParams(
		address _pool,
		bytes32 _key,
		uint256 _value
	) external {
		require(
			msg.sender == owner || msg.sender == developer,
			"ONX: FORBIDDEN"
		);
		_setPoolParams(_pool, _key, _value);
	}

	function getParams(bytes32 _key)
		external
		view
		returns (
			uint256
		)
	{
		return params[_key];
	}

	function getPoolParams(address _pool, bytes32 _key)
		external
		view
		returns (
			uint256
		)
	{
		return poolParams[_pool][_key];
	}

	function convertTokenAmount(
		address _fromToken,			////// usually collateral token
		address _toToken,			////// usually lend token
		uint256 _fromAmount
	) external view returns (uint256 toAmount) {
		// use original price calculation on other token
		// use ratio for aETH
		if (address(WETH) == address(_toToken)) {
			toAmount = _fromAmount.mul(IAETH(_fromToken).ratio()).div(1e18);
		} else {
			uint256 fromPrice = prices[_fromToken];
			uint256 toPrice = prices[_toToken];
			uint8 fromDecimals = IERC20(_fromToken).decimals();
			uint8 toDecimals = IERC20(_toToken).decimals();
			toAmount = _fromAmount.mul(fromPrice).div(toPrice);
			if (fromDecimals > toDecimals) {
				toAmount = toAmount.div(10**(fromDecimals.sub(toDecimals)));
			} else if (toDecimals > fromDecimals) {
				toAmount = toAmount.mul(10**(toDecimals.sub(fromDecimals)));
			}
		}
	}
}
