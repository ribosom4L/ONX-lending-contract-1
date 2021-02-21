const { expect, use } = require('chai');

const { ethers, upgrades } = require("hardhat");

const { Contract, BigNumber } = require('ethers');
const { deployContract, MockProvider, solidity } = require('ethereum-waffle');


// const ERC20 = require("../artifacts/contracts/test/ERC20TOKEN.sol/ERC20TOKEN.json")
const AETH = require("../artifacts/contracts/test/AETH.sol/AETH.json")
const WETH = require("../artifacts/contracts/weth/WETH.sol/WETH9.json");
const ONXConfig = require("../artifacts/contracts/ONXConfig.sol/ONXConfig.json")
const ONXPlatform = require("../artifacts/contracts/ONXPlatform.sol/ONXPlatform.json")
const ONX = require("../artifacts/contracts/ONX.sol/ONXPool.json")
const ONXFactory = require("../artifacts/contracts/ONXFactory.sol/ONXFactory.json")
const ONXStrategy = require("../artifacts/contracts/ONXStrategy.sol/ONXStrategy.json")
const ONXSupplyToken = require("../artifacts/contracts/ONXSupplyToken.sol/ONXSupplyToken.json")
const ONXTestFarm = require("../artifacts/contracts/test/ONXTestFarm.sol/ONXTestFarm.json")
const ONXTestToken = require("../artifacts/contracts/test/ONXTestToken.sol/ONXTestToken.json")
const BN = require('bignumber.js')

use(solidity);

function convertBigNumber(bnAmount, divider) {
	return new BN(bnAmount.toString()).dividedBy(new BN(divider)).toFixed();
}

let address0 = "0x0000000000000000000000000000000000000000";

describe('deploy', () => {
	let provider = new MockProvider({ ganacheOptions: { gasLimit: 8000000 } });
	const [walletMe, walletOther, walletDeveloper, walletTeam, walletSpare, walletPrice, wallet1, wallet2, wallet3, wallet4] = provider.getWallets();
	let configContract;
	let factoryContract;
	let poolContract;
	let platformContract;
	let tokenContract;
	let tokenWETH;
	let tokenAETH;
	let farmContract;
	let collateralStrategyContract;
	let supplyStrategyContract;
	let onxSupplyTokenContract;
	////// let poolContract;
	let tx;
	let receipt;

	async function getBlockNumber() {
		const blockNumber = await provider.getBlockNumber()
		console.log("Current block number: " + blockNumber);
		return blockNumber;
	}

	async function mineBlock(provider, timestamp) {
		return provider.send('evm_mine', [timestamp])
	}

	before(async () => {
		configContract = await deployContract(walletDeveloper, ONXConfig);
		factoryContract = await deployContract(walletDeveloper, ONXFactory, [], { gasLimit: 7000000 });
		// FIXME: Use deployProxy instead of this
		await factoryContract.connect(walletDeveloper).initialize()
		
		// tokenContract  = await deployContract(walletDeveloper, ERC20, ['ONX', 'ONX', 18, ethers.utils.parseEther('1000000')]);
		tokenContract = await deployContract(walletDeveloper, ONXTestToken, []);
		tokenWETH = await deployContract(walletDeveloper, WETH);
		tokenAETH = await deployContract(walletDeveloper, AETH);
		onxSupplyTokenContract = await deployContract(walletDeveloper, ONXSupplyToken);
		farmContract = await deployContract(walletDeveloper, ONXTestFarm, [tokenContract.address, wallet1.address, wallet2.address], { gasLimit: 7000000 });

		platformContract = await deployContract(walletDeveloper, ONXPlatform, [], { gasLimit: 5000000 });
		await platformContract.connect(walletDeveloper).initialize(wallet3.address, onxSupplyTokenContract.address);
		////// rewardToken = await deployContract(walletDeveloper, SushiToken);
		////// masterChef  = await deployContract(walletDeveloper, MasterChef,
		////// 	[rewardToken.address, walletDeveloper.address, ethers.utils.parseEther('1'), 0, 20]);
		console.log('before onxSupplyToken owner:', (await onxSupplyTokenContract.owner()));
		await onxSupplyTokenContract.transferOwnership(platformContract.address);
		console.log('after onxSupplyToken owner:', (await onxSupplyTokenContract.owner()));

		await (await farmContract.connect(walletDeveloper).add(20, tokenAETH.address, false)).wait();
		await (await farmContract.connect(walletDeveloper).add(20, onxSupplyTokenContract.address, false)).wait();
		await tokenContract.transferOwnership(farmContract.address);
		console.log('onxFarm 0 lp:', (await farmContract.poolInfo(0)).token);
		console.log('onxFarm 1 lp:', (await farmContract.poolInfo(1)).token);

		await getBlockNumber();

		console.log('configContract = ', configContract.address);
		console.log('factoryContract = ', factoryContract.address);
		console.log('platformContract address = ', platformContract.address);
		console.log('tokenContract address = ', tokenContract.address);
		console.log('tokenWETH address = ', tokenWETH.address);
		console.log('tokenAETH address = ', tokenAETH.address);

		console.log('team:', ethers.utils.formatBytes32String("team"))
		console.log('spare:', ethers.utils.formatBytes32String("spare"))
		console.log('reward:', ethers.utils.formatBytes32String("reward"))
		console.log('price:', ethers.utils.formatBytes32String("price"))
		console.log('POOL_PRICE:', ethers.utils.formatBytes32String("POOL_PRICE"))
		console.log('changePricePercent:', ethers.utils.formatBytes32String("CHANGE_PRICE_PERCENT"))
		console.log('liquidationRate:', ethers.utils.formatBytes32String("POOL_LIQUIDATION_RATE"))

		await configContract.connect(walletDeveloper).initialize(
			platformContract.address,
			factoryContract.address,
			tokenContract.address,
			tokenWETH.address
		);

		await factoryContract.connect(walletDeveloper).setupConfig(configContract.address);
		await platformContract.connect(walletDeveloper).setupConfig(configContract.address);
		//await tokenContract.connect(walletDeveloper).setupConfig(configContract.address);

		// await configContract.connect(walletDeveloper).initParameter();
		await configContract.connect(walletDeveloper).setWallets([
			ethers.utils.formatBytes32String("team"),
			ethers.utils.formatBytes32String("spare"),
			ethers.utils.formatBytes32String("price")
		], [
			walletTeam.address,
			walletSpare.address,
			walletPrice.address
		]);

		////// let bytecodeHash = ethers.utils.keccak256('0x'+ONXBallot.bytecode);
		////// console.log('hello world', bytecodeHash);
		let developer = await configContract.connect(walletDeveloper).owner();
		console.log('developer:', developer, walletDeveloper.address)
		////// await factoryContract.connect(walletDeveloper).changeBallotByteHash(bytecodeHash);
		// await configContract.connect(walletDeveloper).addMintToken(tokenWETH.address);
		await configContract.connect(walletPrice).setTokenPrice([
			tokenWETH.address, tokenAETH.address], [ethers.utils.parseEther('1'), ethers.utils.parseEther('1')]);

		// poolContract  = await upgrades.deployProxy(
		// 	new ethers.ContractFactory(ONX.abi, ONX.bytecode, walletDeveloper),
		// 	[factoryContract.address],
		// 	{ unsafeAllowCustomTypes: true }
		// );

		// FIXME: deployProxy
		poolContract = await deployContract(walletDeveloper, ONX, []);
		await poolContract.connect(walletDeveloper).initialize(factoryContract.address)
		console.log("creting pool")
		await factoryContract.connect(walletDeveloper).createPool(poolContract.address, tokenWETH.address, tokenAETH.address);

		console.log("OK")
		let pool = await factoryContract.connect(walletDeveloper).getPool(tokenWETH.address, tokenAETH.address);
		// poolContract  = new Contract(pool, ONX.abi, provider).connect(walletMe);

		collateralStrategyContract = await deployContract(walletDeveloper, ONXStrategy, []);
		supplyStrategyContract = await deployContract(walletDeveloper, ONXStrategy, []);
		// FIXME: deployProxy
		// await collateralStrategyContract.connect(walletDeveloper).strategy_initialize()

		await collateralStrategyContract.connect(walletDeveloper).initialize(tokenContract.address, tokenAETH.address, poolContract.address, farmContract.address, 0);
		await supplyStrategyContract.connect(walletDeveloper).initialize(tokenContract.address, onxSupplyTokenContract.address, poolContract.address, farmContract.address, 1);
		await platformContract.connect(walletDeveloper).setCollateralStrategy(tokenWETH.address, tokenAETH.address, collateralStrategyContract.address, supplyStrategyContract.address);
		////// strategy = await deployContract(walletDeveloper, SLPStrategy, []);
		////// await strategy.connect(walletDeveloper).initialize(rewardToken.address, tokenAETH.address, poolContract.address, masterChef.address, 0);

		await (await tokenWETH.connect(walletOther).approve(platformContract.address, ethers.utils.parseEther('1000000'))).wait();
		await (await tokenAETH.connect(walletOther).approve(platformContract.address, ethers.utils.parseEther('1000000'))).wait();
		await (await tokenAETH.connect(walletMe).approve(platformContract.address, ethers.utils.parseEther('1000000'))).wait();
		await (await tokenWETH.connect(walletMe).approve(platformContract.address, ethers.utils.parseEther('1000000'))).wait();

		await (await tokenWETH.connect(walletDeveloper).deposit({ value: ethers.utils.parseEther('5000') })).wait();
		await (await tokenAETH.connect(walletDeveloper).transfer(walletOther.address, ethers.utils.parseEther('100000'))).wait();
		await (await tokenAETH.connect(walletDeveloper).transfer(walletMe.address, ethers.utils.parseEther('100000'))).wait();
		await (await tokenWETH.connect(walletDeveloper).transfer(walletOther.address, ethers.utils.parseEther('2000'))).wait();
		await (await tokenWETH.connect(walletDeveloper).transfer(walletMe.address, ethers.utils.parseEther('2000'))).wait();

		expect(convertBigNumber((await tokenWETH.balanceOf(walletMe.address)), 1e18)).to.equals('2000');
		expect(convertBigNumber((await tokenWETH.balanceOf(walletOther.address)), 1e18)).to.equals('2000');

		await tokenAETH.connect(walletDeveloper).setRatioHarness(ethers.utils.parseEther('0.91'));
	})

	beforeEach(async () => {
		await tokenAETH.connect(walletDeveloper).setRatioHarness(ethers.utils.parseEther('0.91'));
	})

	it("simple test", async () => {
		console.log('payout balance: ', convertBigNumber(await provider.getBalance(wallet3.address), 1e18));

		let pool = await factoryContract.connect(walletDeveloper).getPool(tokenWETH.address, tokenAETH.address);
		await (await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();
		console.log("onxSupply balance of stt", convertBigNumber(await onxSupplyTokenContract.balanceOf(farmContract.address), 1));
		const poolContract = new Contract(pool, ONX.abi, provider).connect(walletMe);

		console.log(convertBigNumber((await poolContract.supplys(walletMe.address)).amountSupply, 1e18));
		//expect(convertBigNumber((await poolContract.supplys(walletMe.address)).amountSupply, 1e18)).to.equals('200');

		//expect(convertBigNumber((await poolContract.supplys(walletMe.address)).amountSupply, 1e18)).to.equals('200');
		//expect(convertBigNumber(await poolContract.remainSupply(), 1e18)).to.equals('200');

		console.log("1111", convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1));
		//expect(convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1)).to.equals('0');


		await (await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('30'))).wait();
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletMe.address), 1e18)).to.equals('99500');
		//expect(convertBigNumber((await poolContract.supplys(walletMe.address)).amountSupply, 1e18)).to.equals('30');
		//expect(convertBigNumber(await poolContract.remainSupply(), 1e18)).to.equals('30');

		console.log("ONX", convertBigNumber(await tokenContract.balanceOf(poolContract.address), 1));
		//expect(convertBigNumber(await tokenContract.balanceOf(poolContract.address), 1)).to.equals('0');
		console.log("2222", convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1));
		//expect(convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1)).to.equals('0');

		await (await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('30'))).wait();

		//expect(convertBigNumber(await tokenWETH.balanceOf(walletMe.address), 1e18)).to.equals('100000');
		//expect(convertBigNumber((await poolContract.supplys(walletMe.address)).amountSupply, 1e18)).to.equals('0');
		//expect(convertBigNumber(await poolContract.remainSupply(), 1e18)).to.equals('0');

		console.log("3333", convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1));
		//expect(convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1)).to.equals('0');
		await (await poolContract.connect(walletMe).mint()).wait();
		console.log(convertBigNumber(await tokenContract.balanceOf(walletMe.address), 1));
		//expect(convertBigNumber(await tokenContract.balanceOf(walletMe.address), 1)).to.equals('0');
		console.log(convertBigNumber(await tokenContract.balanceOf(walletTeam.address), 1));
		//expect(convertBigNumber(await tokenContract.balanceOf(walletTeam.address), 1)).to.equals('0');
		console.log(convertBigNumber(await tokenContract.balanceOf(walletSpare.address), 1));
		//expect(convertBigNumber(await tokenContract.balanceOf(walletSpare.address), 1)).to.equals('0');
		console.log(convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1));
		//expect(convertBigNumber(await poolContract.connect(walletMe).takeLendWithAddress(walletMe.address), 1)).to.equals('0');
	})

	it('deposit(200) -> borrow(20) -> repay(20) -> withdraw(200)', async () => {

		await (await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();
		console.log('after deposit: ',
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			'pool AETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('200');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');

		let maxBorrow = await platformContract.getMaximumBorrowAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		console.log('maxBorrow:', convertBigNumber(maxBorrow, 1e18), 'WETH');
		//expect(convertBigNumber(maxBorrow, 1)).to.equals('1200000000000000000');
		await (await platformContract.connect(walletOther).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'), 0)).wait();
		console.log('after borrow: ',
			'wallet WETH', convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18),
			'wallet AETH', convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			'pool AETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)).to.equals('900000');
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('99900');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('200');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('20');

		let { supplyInterestPerBlock, borrowInterestPerBlock } = await poolContract.getInterests();
		console.log('getInterests - supply:', convertBigNumber(supplyInterestPerBlock, 1e18));
		console.log('getInterests - borrow:', convertBigNumber(borrowInterestPerBlock, 1e18));
		//expect(convertBigNumber(await poolContract.getInterests(), 1e18)).to.equals('0.000000085616438356');

		console.log('before repay:',
			convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)).to.equals('900000');
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('99900');

		tx = await platformContract.connect(walletOther).repay(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		let receipt = await tx.wait()
		console.log('repay gas:', receipt.gasUsed.toString())
		// console.log('events:', receipt.events)
		// console.log(receipt.events[2].event, 'args:', receipt.events[2].args)
		// console.log('_supplyAmount:', convertBigNumber(receipt.events[2].args._supplyAmount, 1))
		// console.log('_collateralAmount:', convertBigNumber(receipt.events[2].args._collateralAmount, 1))
		// console.log('_interestAmount:', convertBigNumber(receipt.events[2].args._interestAmount, 1))


		////// await strategy.connect(walletOther).mint();
		////// console.log('after repay with SUSHI: ',
		////// 	convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
		////// 	convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
		////// 	convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
		////// 	convertBigNumber(await rewardToken.balanceOf(walletOther.address), 1e18),
		////// 	convertBigNumber(await rewardToken.balanceOf(strategy.address), 1e18));

		// await SupplyStruct(walletMe.address);
		// await sevenInfo();
		console.log('before withdraw: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'));
		console.log('after withdraw: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1)).to.equals('0');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1)).to.equals('0');
		console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address), 1e18))
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18)).to.equals('0');

	});

	async function sevenInfo() {
		let result = {
			interestPerSupply: await poolContract.interestPerSupply(),
			liquidationPerSupply: await poolContract.liquidationPerSupply(),
			interestPerBorrow: await poolContract.interestPerBorrow(),
			totalLiquidation: await poolContract.totalLiquidation(),
			totalLiquidationSupplyAmount: await poolContract.totalLiquidationSupplyAmount(),
			totalBorrow: await poolContract.totalBorrow(),
			totalPledge: await poolContract.totalPledge(),
			remainSupply: await poolContract.remainSupply(),
			lastInterestUpdate: await poolContract.lastInterestUpdate()
		};

		console.log('===sevenInfo begin===');
		for (let k in result) {
			console.log(k + ':', convertBigNumber(result[k], 1))
		}
		console.log('===sevenInfo end===')
		return result;
	};

	async function SupplyStruct(user) {
		let result = await poolContract.supplys(user);

		console.log('===SupplyStruct begin===');
		for (let k in result) {
			console.log(k + ':', convertBigNumber(result[k], 1))
		}
		console.log('===SupplyStruct end===');
		return result;
	};

	async function BorrowStruct(user) {
		let result = await poolContract.borrows(user);

		console.log('===BorrowStruct begin===');
		for (let k in result) {
			console.log(k + ':', convertBigNumber(result[k], 1))
		}
		console.log('===BorrowStruct end===');
		return result;
	};

	it('deposit(200) -> borrow(20) -> repay(20) -> withdraw(200)', async () => {
		await (await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();
		console.log('after deposit: ',
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			'pool AETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('200');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');

		let maxBorrow = await platformContract.getMaximumBorrowAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		console.log('maxBorrow:', convertBigNumber(maxBorrow, 1e18), 'WETH');
		//expect(convertBigNumber(maxBorrow, 1)).to.equals('1200000000000000000');
		await (await platformContract.connect(walletOther).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'), maxBorrow)).wait();
		console.log('after borrow: ',
			'wallet WETH', convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18),
			'wallet AETH', convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			'pool AETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)).to.equals('900001.2');
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('99900');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('998.8');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('20');

		let { supplyInterestPerBlock, borrowInterestPerBlock } = await poolContract.getInterests();
		console.log('getInterests - supply:', convertBigNumber(supplyInterestPerBlock, 1e18));
		console.log('getInterests - borrow:', convertBigNumber(borrowInterestPerBlock, 1e18));
		//expect(convertBigNumber(await poolContract.getInterests(), 1e18)).to.equals('0.000000085719178082');

		console.log('before repay:',
			convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)).to.equals('900001.2');
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('99900');

		tx = await platformContract.connect(walletOther).repay(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		let receipt = await tx.wait()
		console.log('repay gas:', receipt.gasUsed.toString())
		// console.log('events:', receipt.events)
		// console.log(receipt.events[2].event, 'args:', receipt.events[2].args)
		// console.log('_supplyAmount:', convertBigNumber(receipt.events[2].args._supplyAmount, 1))
		// console.log('_collateralAmount:', convertBigNumber(receipt.events[2].args._collateralAmount, 1))
		// console.log('_interestAmount:', convertBigNumber(receipt.events[2].args._interestAmount, 1))


		////// await strategy.connect(walletOther).mint();
		////// console.log('after repay with SUSHI: ',
		////// 	convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
		////// 	convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
		////// 	convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
		////// 	convertBigNumber(await rewardToken.balanceOf(walletOther.address), 1e18),
		////// 	convertBigNumber(await rewardToken.balanceOf(strategy.address), 1e18));

		// await SupplyStruct(walletMe.address);
		// await sevenInfo();
		console.log('before withdraw: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'));
		console.log('after withdraw: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1)).to.equals('698');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1)).to.equals('0');
		console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address), 1e18))
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18)).to.equals('0');
	});

	it('WETH->WETH deposit(200) -> borrow(20) -> repay(20) -> withdraw(200)', async () => {
		console.log('before deposit: ',
			convertBigNumber(await tokenAETH.balanceOf(walletMe.address), 1),
			convertBigNumber(await provider.getBalance(walletMe.address), 1));
		await (await platformContract.connect(walletMe).depositETH(tokenWETH.address, tokenAETH.address, { value: ethers.utils.parseEther('200') })).wait();
		console.log('after deposit: ',
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			'pool WETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('200');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');

		let maxBorrow = await platformContract.getMaximumBorrowAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('100'));
		console.log('maxBorrow:', convertBigNumber(maxBorrow, 1e18), 'WETH');
		//expect(convertBigNumber(maxBorrow, 1)).to.equals('3000000000000000000000');
		console.log('before deposit: ',
			convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1),
			convertBigNumber(await provider.getBalance(walletOther.address), 1));
		await (await platformContract.connect(walletOther).borrow(tokenWETH.address, tokenAETH.address, maxBorrow, ethers.utils.parseEther('20'))).wait();
		console.log('after borrow: ',
			'wallet AETH', convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
			'wallet WETH', convertBigNumber(await provider.getBalance(walletOther.address), 1e18),
			'pool WETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('897000');
		//expect(convertBigNumber(await provider.getBalance(walletOther.address), 1e18)).to.equals('10000000000000099.997201734');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('3000');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('900');

		let { supplyInterestPerBlock, borrowInterestPerBlock } = await poolContract.getInterests();
		console.log('getInterests - supply:', convertBigNumber(supplyInterestPerBlock, 1e18));
		console.log('getInterests - borrow:', convertBigNumber(borrowInterestPerBlock, 1e18));
		//expect(convertBigNumber(await poolContract.getInterests(), 1e18)).to.equals('0.000000094178082191');
		let repayAmount = await platformContract.getRepayAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'), walletOther.address);
		repayAmount = repayAmount.mul(15).div(10);
		console.log('before repay:',
			convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
			convertBigNumber(repayAmount, 1));
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)).to.equals('0');
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('897000');
		//expect(convertBigNumber(repayAmount, 1)).to.equals('4999999999999999999');

		tx = await platformContract.connect(walletOther).repayETH(
			tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'), { value: repayAmount });
		let receipt = await tx.wait()
		console.log('repay gas:', receipt.gasUsed.toString())

		// await SupplyStruct(walletMe.address);
		// await sevenInfo();
		await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		console.log('after withdraw: ',
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await provider.getBalance(walletOther.address), 1e18));
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1)).to.equals('0');
		//expect(convertBigNumber(await provider.getBalance(walletOther.address), 1)).to.equals('10000000000000096662977962739726031');
		console.log('wallet team:', convertBigNumber(await tokenAETH.balanceOf(walletTeam.address), 1e18))
		console.log('---------------farming---------------', convertBigNumber(await tokenAETH.balanceOf(farmContract.address), 1e18))
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletTeam.address),1e18)).to.equals('0');
	});

	it('deposit(200) -> borrow(20) -> liquidation(20) -> withdraw(200)', async () => {
		console.log('before deposit: ',
			convertBigNumber(await tokenWETH.balanceOf(walletMe.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(walletMe.address), 1e18));
		await (await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();
		console.log('after deposit: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('200');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');
		let maxBorrow = await platformContract.getMaximumBorrowAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('150'));
		console.log('max borrow', convertBigNumber(maxBorrow, 1e18));
		//expect(convertBigNumber(maxBorrow, 1e18)).to.equals('120');
		console.log('before borrow: ',
			convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18));
		console.log('pool aeth balance: ',
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		await (await platformContract.connect(walletOther).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('150'), maxBorrow)).wait();
		console.log('after borrow: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('880');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('150');
		////// await(await platformContract.connect(walletDeveloper).updatePoolParameter(
		//////	tokenWETH.address, tokenAETH.address, ethers.utils.formatBytes32String("POOL_PRICE"), ethers.utils.parseEther('0.01'))).wait();

		await tokenAETH.connect(walletDeveloper).setRatioHarness(ethers.utils.parseEther('0.16'));

		//let poolPrice = convertBigNumber(await configContract.getPoolValue(poolContract.address, ethers.utils.formatBytes32String("POOL_PRICE")), 1e18);
		//console.log('poolPrice', poolPrice)
		//expect(poolPrice).to.equals('0.01');
		let amountCollateral = convertBigNumber((await poolContract.borrows(walletOther.address)).amountCollateral, 1e18);
		console.log('amountCollateral', amountCollateral)
		//expect(amountCollateral).to.equals('150');
		let amountBorrow = convertBigNumber((await poolContract.borrows(walletOther.address)).amountBorrow, 1e18);
		console.log('amountBorrow', amountBorrow)
		//expect(amountBorrow).to.equals('120');

		//expect(convertBigNumber(await poolContract.totalPledge(), 1e18)).to.equals('150');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('150');

		await (await platformContract.connect(walletMe).liquidation(tokenWETH.address, tokenAETH.address, walletOther.address)).wait();
		console.log('after liquidation: ',
			convertBigNumber(await poolContract.totalPledge(), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await poolContract.totalPledge(), 1e18)).to.equals('150');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('150');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('880');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('150');

		// await SupplyStruct(walletMe.address);
		// await sevenInfo();
		// await(await platformContract.connect(walletDeveloper).updatePoolParameter(
		// 	tokenWETH.address, tokenAETH.address, ethers.utils.formatBytes32String("POOL_PRICE"), ethers.utils.parseEther('0.02'))).wait();
		await (await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();

		console.log('after withdraw: ',
			convertBigNumber(await poolContract.totalPledge(), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await poolContract.totalPledge(), 1e18)).to.equals('0');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('0.00000000000000092');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');
		console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address), 1e18))
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18)).to.equals('0');
	});

	it('deposit(200) -> borrow(20) -> liquidation(20) -> reinvest() -> withdraw(200)', async () => {

		await (await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();
		console.log('after deposit: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('200');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');
		let maxBorrow = await platformContract.getMaximumBorrowAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('150'));
		console.log('before borrow',
			convertBigNumber(maxBorrow, 1e18),
			convertBigNumber(await poolContract.totalPledge(), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18),
			convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)
		)
		//expect(convertBigNumber(maxBorrow, 1e18)).to.equals('120');
		//expect(convertBigNumber(await poolContract.totalPledge(), 1e18)).to.equals('0');
		//expect(convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18)).to.equals('0');
		//expect(convertBigNumber(await tokenAETH.balanceOf(walletOther.address), 1e18)).to.equals('100000');
		//expect(convertBigNumber(await tokenWETH.balanceOf(walletOther.address), 1e18)).to.equals('900000');
		await (await platformContract.connect(walletOther).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('150'), maxBorrow)).wait();
		console.log('after borrow: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('880');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('880');

		////// await(await platformContract.connect(walletDeveloper).updatePoolParameter(
		//////	tokenWETH.address, tokenAETH.address, ethers.utils.formatBytes32String("POOL_PRICE"), ethers.utils.parseEther('0.01'))).wait();

		await tokenAETH.connect(walletDeveloper).setRatioHarness(ethers.utils.parseEther('0.6'));

		await (await platformContract.connect(walletMe).liquidation(tokenWETH.address, tokenAETH.address, walletOther.address)).wait();

		console.log('after liquidation: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('880');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('880');
		let tx = await poolContract.liquidationHistory(walletOther.address, 0);

		// console.log(tx)
		// await SupplyStruct(walletMe.address);
		// console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18))
		await (await platformContract.connect(walletMe).reinvest(tokenWETH.address, tokenAETH.address)).wait();
		console.log('after reinvest');
		// console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18))
		// await SupplyStruct(walletMe.address);
		// await sevenInfo();
		// await(await platformContract.connect(walletDeveloper).updatePoolParameter(
		// 	tokenWETH.address, tokenAETH.address, ethers.utils.formatBytes32String("POOL_PRICE"), ethers.utils.parseEther('0.02'))).wait();

		console.log('before withdraw');
		await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'));

		console.log('after withdraw: ',
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18));
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('0.0000182268488899');
		//expect(convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18)).to.equals('0.0000182268488899');
		// await sevenInfo();
	});

	it('liquidation list test', async () => {
		// console.log('1')
		// await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'));
		// console.log('2')
		// await tokenAETH.connect(walletOther).transfer(wallet1.address, ethers.utils.parseEther('200'));
		// await tokenAETH.connect(walletOther).transfer(wallet2.address, ethers.utils.parseEther('200'));
		// await tokenAETH.connect(walletOther).transfer(wallet3.address, ethers.utils.parseEther('200'));
		// await tokenAETH.connect(walletOther).transfer(wallet4.address, ethers.utils.parseEther('200'));
		// console.log('3')
		// await tokenAETH.connect(wallet1).approve(poolContract.address, ethers.utils.parseEther('1000000'));
		// await tokenAETH.connect(wallet2).approve(poolContract.address, ethers.utils.parseEther('1000000'));
		// await tokenAETH.connect(wallet3).approve(poolContract.address, ethers.utils.parseEther('1000000'));
		// await tokenAETH.connect(wallet4).approve(poolContract.address, ethers.utils.parseEther('1000000'));
		// // console.log('wallet team2:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18))
		// console.log('4')
		// await platformContract.connect(wallet1).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'), ethers.utils.parseEther('1'));
		// // await platformContract.connect(wallet2).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'), ethers.utils.parseEther('1'));
		// // await platformContract.connect(wallet3).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'), ethers.utils.parseEther('1'));
		// // await platformContract.connect(wallet4).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'), ethers.utils.parseEther('1'));
		// //await platformContract.connect(wallet5).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'), ethers.utils.parseEther('1'));
		// console.log('5')
		// await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('30'));
		// // console.log('wallet team3:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18))
		// console.log('6')
		// await platformContract.connect(walletDeveloper).updatePoolParameter(
		// 	tokenWETH.address, tokenAETH.address, ethers.utils.formatBytes32String("POOL_PRICE"), ethers.utils.parseEther('0'));
		// // console.log('wallet team4:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18))
		// // await platformContract.connect(walletDeveloper).updatePoolParameter(
		// // 	tokenWETH.address, tokenAETH.address, ethers.utils.formatBytes32String("POOL_PRICE"), ethers.utils.parseEther('0.001'));
		// await platformContract.connect(walletMe).liquidation(tokenWETH.address, tokenAETH.address, wallet1.address);


		// await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('30'));

		// // console.log('hello world')

		// let tx = await queryContract.iterateLiquidationInfo(0, 0, 10);

		// for(var i = 0 ;i < tx.liquidationCount.toNumber(); i ++)
		// {
		// 	console.log(tx.liquidationList[i].user, tx.liquidationList[i].//expectedRepay.toString(), tx.liquidationList[i].amountCollateral.toString())
		// }


		// console.log(tx.liquidationCount.toString())
		// console.log(tx.poolIndex.toString())
		// console.log(tx.userIndex.toString())
		//1000000000000000000000
		//   1000000038717656007
	});

	it('test circuit breaker', async () => {
		console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address), 1e18))

		// let priceDurationKey = ethers.utils.formatBytes32String('POOL_LIQUIDATION_RATE');
		// let price002 = ethers.utils.parseEther('0.002')
		// let price001 = ethers.utils.parseEther('0.001')
		// console.log((await configContract.params(priceDurationKey)).toString())
		// // await configContract.connect(walletPrice).setPoolPrice([poolContract.address], [price002]);
		// //expect(await configContract.connect(walletPrice).setPoolPrice([poolContract.address], [price002])).to.be.revertedWith('7UP: Price FORBIDDEN');
		// console.log('hello world')
		// //expect(await configContract.connect(walletPrice).setPoolPrice([poolContract.address], [price002])).to.be.revertedWith('7UP: Price FORBIDDEN');

		// await configContract.connect(walletDeveloper).setParameter([priceDurationKey],[0]);
		// console.log((await configContract.params(priceDurationKey)).toString())
		// //expect(await configContract.connect(walletPrice).setPoolPrice([poolContract.address], [price002])).to.be.revertedWith('7UP: Config FORBIDDEN');
		// console.log('set price to 0.002')
		// await configContract.connect(walletPrice).setPoolPrice([poolContract.address], [price002]);
		// console.log('set price to 0.001')
		// await configContract.connect(walletDeveloper).setPoolPrice([poolContract.address], [ethers.utils.parseEther('0.001')]);
	});

	it('test withdrawable/reinvestable', async () => {
		let totalSupply = (await poolContract.totalBorrow()).add(await poolContract.remainSupply());
		let interestPerSupply = await poolContract.interestPerSupply();
		let interests = await poolContract.getInterests();
		let totalBorrow = await poolContract.totalBorrow();
		let meInterests = (await poolContract.supplys(walletMe.address)).interests;
		let interestSettled = (await poolContract.supplys(walletMe.address)).interestSettled;
		let meSupply = (await poolContract.supplys(walletMe.address)).amountSupply;
		let remainSupply = (await poolContract.remainSupply());
		let deltaBlock = (await provider.getBlockNumber()) - (await poolContract.lastInterestUpdate());

		meInterests = meInterests.add(interestPerSupply.mul(meSupply).div(ethers.utils.parseEther('1')).sub(interestSettled));

		console.log('deltaBlock=', deltaBlock);
		console.log('totalSupply=', convertBigNumber(totalSupply, 1e18));
		console.log('interestPerSupply=', convertBigNumber(interestPerSupply, 1e18));
		console.log('interests=', convertBigNumber(interests, 1e18));
		console.log('totalBorrow=', convertBigNumber(totalBorrow, 1e18));
		console.log('meInterests=', convertBigNumber(meInterests, 1e18));
		console.log('interestSettled=', convertBigNumber(interestSettled, 1e18));
		console.log('meSupply=', convertBigNumber(meSupply, 1e18));
		console.log('remainSupply=', convertBigNumber(remainSupply, 1e18));
		//expect(deltaBlock).to.equals(10);
		//expect(convertBigNumber(totalSupply, 1e18)).to.equals('0');
		//expect(convertBigNumber(interestPerSupply, 1e18)).to.equals('0');
		//expect(convertBigNumber(interests, 1e18)).to.equals('0');
		//expect(convertBigNumber(totalBorrow, 1e18)).to.equals('0');
		//expect(convertBigNumber(meInterests, 1e18)).to.equals('0');
		//expect(convertBigNumber(interestSettled, 1e18)).to.equals('0');
		//expect(convertBigNumber(meSupply,1e18)).to.equals('0');
		//expect(convertBigNumber(remainSupply, 1e18)).to.equals('0');

		//test reinvestable :
		let reinvestAmount = meInterests
		if (reinvestAmount < remainSupply) {
			console.log('ok to invest');
		}
		else {
			console.log('not enough money to pay');
		}

		//test withdrawable :
		let a = meInterests;
		console.log('a=', convertBigNumber(a, 1e18));
		//expect(a).to.equals(0);
		let withdrawAmount = meSupply.add(a);
		console.log('withdrawAmount=', convertBigNumber(withdrawAmount, 1e18));
		//expect(convertBigNumber(withdrawAmount, 1e18)).to.equals('0');
		if (withdrawAmount < remainSupply) {
			console.log('ok  to withdraw');
		}
		else {
			console.log('not enough money to withdraw');
		}

		console.log('payout balance: ', convertBigNumber(await provider.getBalance(wallet3.address), 1));
		console.log('after test: ',
			'pool WETH', convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1e18),
			'pool AETH', convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1e18));

		console.log('remainSupply: ', convertBigNumber((await poolContract.remainSupply()), 1));
		console.log('totalBorrow: ', convertBigNumber((await poolContract.totalBorrow()), 1));
		console.log('totalStake: ', convertBigNumber((await poolContract.totalStake()), 1));
		console.log('totalPledge: ', convertBigNumber((await poolContract.totalPledge()), 1));
		console.log('payoutRatio: ', convertBigNumber((await poolContract.payoutRatio()), 1));

		let { supplyInterestPerBlock, borrowInterestPerBlock } = await poolContract.getInterests();
		console.log('getInterests - supply:', convertBigNumber(supplyInterestPerBlock, 1e18));
		console.log('getInterests - borrow:', convertBigNumber(borrowInterestPerBlock, 1e18));

		console.log('pending onx(supply): ', convertBigNumber((await supplyStrategyContract.connect(walletDeveloper).query()), 1));
		console.log('pending onx(collateral): ', convertBigNumber((await collateralStrategyContract.connect(walletMe).query()), 1));
	})

	it("strategy test", async () => {
		////// await(await platformContract.connect(walletMe).deposit(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'))).wait();

		////// let maxBorrow = await platformContract.getMaximumBorrowAmount(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		////// console.log('maxBorrow:', convertBigNumber(maxBorrow, 1), 'WETH');
		////// await(await platformContract.connect(walletOther).borrow(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'), maxBorrow)).wait();

		////// //switch strategy
		////// console.log("switch start");
		////// let strategy2 = await deployContract(walletDeveloper, SLPStrategy, []);
		////// await (await strategy2.connect(walletDeveloper).initialize(rewardToken.address, tokenAETH.address, poolContract.address, masterChef.address, 0)).wait();
		////// await (await platformContract.connect(walletDeveloper).switchStrategy(tokenWETH.address, tokenAETH.address, strategy2.address)).wait();
		////// console.log("switch end");

		////// await strategy.connect(walletOther).mint();
		////// console.log("mint1", convertBigNumber(await rewardToken.balanceOf(walletOther.address), 1e18));

		////// await strategy2.connect(walletOther).mint();
		////// console.log("mint2", convertBigNumber(await rewardToken.balanceOf(walletOther.address), 1e18));

		////// tx = await platformContract.connect(walletOther).repay(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('20'));
		////// let receipt = await tx.wait()
		////// console.log('repay gas:', receipt.gasUsed.toString());

		////// await platformContract.connect(walletMe).withdraw(tokenWETH.address, tokenAETH.address, ethers.utils.parseEther('200'));
		////// console.log('after withdraw: ', 
		////// 	convertBigNumber(await tokenWETH.balanceOf(poolContract.address), 1), 
		////// 	convertBigNumber(await tokenAETH.balanceOf(poolContract.address), 1));
		////// console.log('wallet team:', convertBigNumber(await tokenWETH.balanceOf(walletTeam.address),1e18))
	})

})
