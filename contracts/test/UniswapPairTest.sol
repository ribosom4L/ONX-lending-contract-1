// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
import "../libraries/SafeMath.sol";

contract UniswapV2ERC20 {
	using SafeMath for uint256;
	string public constant name = "Uniswap V2";
	string public constant symbol = "UNI-V2";
	uint8 public constant decimals = 18;
	uint256 public totalSupply;
	mapping(address => uint256) public balanceOf;
	mapping(address => mapping(address => uint256)) public allowance;
	event Approval(address indexed owner, address indexed spender, uint256 value);
	event Transfer(address indexed from, address indexed to, uint256 value);

	constructor() public {}

	function _mint(address to, uint256 value) internal {
		totalSupply = totalSupply.add(value);
		balanceOf[to] = balanceOf[to].add(value);
		emit Transfer(address(0), to, value);
	}

	function _burn(address from, uint256 value) internal {
		balanceOf[from] = balanceOf[from].sub(value);
		totalSupply = totalSupply.sub(value);
		emit Transfer(from, address(0), value);
	}

	function _approve(
		address owner,
		address spender,
		uint256 value
	) private {
		allowance[owner][spender] = value;
		emit Approval(owner, spender, value);
	}

	function _transfer(
		address from,
		address to,
		uint256 value
	) internal {
		balanceOf[from] = balanceOf[from].sub(value);
		balanceOf[to] = balanceOf[to].add(value);
		emit Transfer(from, to, value);
	}

	function approve(address spender, uint256 value) external returns (bool) {
		_approve(msg.sender, spender, value);
		return true;
	}

	function transfer(address to, uint256 value) external returns (bool) {
		_transfer(msg.sender, to, value);
		return true;
	}

	function transferFrom(
		address from,
		address to,
		uint256 value
	) external returns (bool) {
		if (allowance[from][msg.sender] != uint256(-1)) {
			allowance[from][msg.sender] = allowance[from][msg.sender].sub(value);
		}
		_transfer(from, to, value);
		return true;
	}
}

contract UniswapPairTest is UniswapV2ERC20 {
	using SafeMath for uint256;
	address public owner;
	address public token0;
	address public token1;
	uint256 public token0Coef = 1;
	uint256 public token1Coef = 1;
	uint256 private reserve0; // uses single storage slot, accessible via getReserves
	uint256 private reserve1; // uses single storage slot, accessible via getReserves
	uint32 private blockTimestampLast; // uses single storage slot, accessible via getReserves

	uint256 private unlocked = 1;
	modifier lock() {
		require(unlocked == 1, "UniswapV2: LOCKED");
		unlocked = 0;
		_;
		unlocked = 1;
	}

	function getReserves()
		public
		view
		returns (
			uint256 _reserve0,
			uint256 _reserve1,
			uint32 _blockTimestampLast
		)
	{
		_reserve0 = reserve0;
		_reserve1 = reserve1;
		_blockTimestampLast = blockTimestampLast;
	}

	event Mint(address indexed sender, uint256 amount0, uint256 amount1);
	event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
	event Swap(
		address indexed sender,
		uint256 amount0In,
		uint256 amount1In,
		uint256 amount0Out,
		uint256 amount1Out,
		address indexed to
	);
	event Sync(uint256 reserve0, uint256 reserve1);

	constructor() public {
		owner = msg.sender;
	}

	// called once by the owner at time of deployment
	function initialize(address _token0, address _token1) external {
		require(msg.sender == owner, "UniswapV2: FORBIDDEN"); // sufficient check
		token0 = _token0;
		token1 = _token1;
	}

	function setCoefficient(uint256 _token0Coef, uint256 _token1Coef) external {
		require(msg.sender == owner, "UniswapV2: FORBIDDEN"); // sufficient check
		token0Coef = _token0Coef;
		token1Coef = _token1Coef;
	}

	function mint(address to, uint256 liquidity) external lock returns (uint256) {
		require(msg.sender == owner, "UniswapV2: FORBIDDEN"); // sufficient check
		uint256 amount0 = liquidity.mul(token0Coef);
		uint256 amount1 = liquidity.mul(token1Coef);
		reserve0 = reserve0.add(amount0);
		reserve1 = reserve1.add(amount1);
		_mint(to, liquidity);
		emit Mint(to, amount0, amount1);
		return liquidity;
	}

	// this low-level function should be called from a contract which performs important safety checks
	function burn(address to, uint256 liquidity) external lock returns (uint256 amount0, uint256 amount1) {
		require(msg.sender == owner, "UniswapV2: FORBIDDEN"); // sufficient check
		amount0 = liquidity.mul(token0Coef);
		amount1 = liquidity.mul(token1Coef);
		require(reserve0 > amount0 && reserve1 > amount1, "UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED");
		reserve0 = reserve0.sub(amount0);
		reserve1 = reserve1.sub(amount1);
		_burn(to, liquidity);
		emit Burn(to, amount0, amount1, address(0));
	}

	function swap() external payable returns (uint256) {
		uint256 amount = msg.value * 1000;
		require(balanceOf[owner] >= amount, "UniswapV2: INSUFFICIENT");
		_transfer(owner, msg.sender, amount);
		return amount;
	}

	function withdraw() external returns (uint256) {
		(bool success, ) = owner.call{value: address(this).balance}(new bytes(0));
		require(success, "ETH_TRANSFER_FAILED");
	}
}
