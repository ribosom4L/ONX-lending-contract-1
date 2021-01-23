let fs = require("fs");
let path = require("path");
const { ethers, upgrades } = require("hardhat");
const ERC20 = require("../artifacts/contracts/test/ERC20TOKEN.sol/ERC20TOKEN.json")
const WETH = require("../artifacts/contracts/weth/WETH.sol/WETH9.json")
const AETH = require("../artifacts/contracts/test/AETH.sol/AETH.json")
const ONXConfig = require("../artifacts/contracts/ONXConfig.sol/ONXConfig.json")
const ONXPlatform = require("../artifacts/contracts/ONXPlatform.sol/ONXPlatform.json")
const ONXPool = require("../artifacts/contracts/ONX.sol/ONXPool.json")
const ONXFactory = require("../artifacts/contracts/ONXFactory.sol/ONXFactory.json")
const ONXStrategyCollateral = require("../artifacts/contracts/ONXStrategyCollateral.sol/ONXStrategyCollateral.json")
const ONXTestFarm = require("../artifacts/contracts/test/ONXTestFarm.sol/ONXTestFarm.json")
const ONXTestToken = require("../artifacts/contracts/test/ONXTestToken.sol/ONXTestToken.json")

let ONX_ADDRESS = ""
let WETH_ADDRESS = ""
let AETH_ADDRESS = ""
let LEND_TOKEN_ADDRESS = ""
let COLLATERAL_TOKEN_ADDRESS = ""
let PLATFORM_ADDRESS = ""
let CONFIG_ADDRESS = ""
let AETH_POOL_ADDRESS = ""
let FACTORY_ADDRESS = ""

let ONXFARM_ADDRESS = ""
let STRATEGY_ADDRESS = ""

const loadJsonFile = require('load-json-file');
const keys = loadJsonFile.sync('./keys.json');

let config = {
    "url": `http://127.0.0.1:8545`,
    "pk": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "gasPrice": "80",
    "walletDev": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", 
    "walletTeam": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", 
    "walletSpare": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", 
    "walletPrice": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "users":["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"],
    "weth_address": "0xE95A203B1a91a908F9B9CE46459d101078c2c3cb"
}

WETH_ADDRESS = config.weth_address

if(fs.existsSync(path.join(__dirname, ".config.json"))) {
    let _config = JSON.parse(fs.readFileSync(path.join(__dirname, ".config.json")).toString());
    for(let k in config) {
        config[k] = _config[k];
    }
}

let ETHER_SEND_CONFIG = {
    gasPrice: ethers.utils.parseUnits(config.gasPrice, "gwei")
}
  

console.log("current endpoint  ", config.url)
let provider = new ethers.providers.JsonRpcProvider(config.url)
let walletWithProvider = new ethers.Wallet(config.pk, provider)

function getWallet(key = config.pk) {
  return new ethers.Wallet(key, provider)
}

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(() => {
      resolve()
    }, ms)
  )

async function waitForMint(tx) {
  console.log('tx:', tx)
  let result = null
  do {
    result = await provider.getTransactionReceipt(tx)
    await sleep(100)
  } while (result === null)
  await sleep(200)
}

async function getBlockNumber() {
  return await provider.getBlockNumber()
}

async function deploy() {
  let factory, ins

  // ONX Token
  factory = new ethers.ContractFactory(
    ONXTestToken.abi,
    ONXTestToken.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  ONX_ADDRESS = ins.address

  // ONX Farm
  factory = new ethers.ContractFactory(
    ONXTestFarm.abi,
    ONXTestFarm.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ONX_ADDRESS, config.walletTeam, config.walletSpare, ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  ONXFARM_ADDRESS = ins.address
  
  // AETH Token
  factory = new ethers.ContractFactory(
    AETH.abi,
    AETH.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  AETH_ADDRESS = ins.address

  // WETH Token
  factory = new ethers.ContractFactory(
    WETH.abi,
    WETH.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  WETH_ADDRESS = ins.address

  COLLATERAL_TOKEN_ADDRESS = AETH_ADDRESS
  LEND_TOKEN_ADDRESS = WETH_ADDRESS

  // PLATFORM
  factory = new ethers.ContractFactory(
    ONXPlatform.abi,
    ONXPlatform.bytecode,
    walletWithProvider
  )
  ins = await upgrades.deployProxy(factory, [])
  await waitForMint(ins.deployTransaction.hash)
  PLATFORM_ADDRESS = ins.address
  console.log('PLATFORM_ADDRESS', PLATFORM_ADDRESS)

  // CONFIG
  factory = new ethers.ContractFactory(
    ONXConfig.abi,
    ONXConfig.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  CONFIG_ADDRESS = ins.address
  console.log('CONFIG_ADDRESS', CONFIG_ADDRESS)

  // FACTORY
  factory = new ethers.ContractFactory(
    ONXFactory.abi,
    ONXFactory.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  FACTORY_ADDRESS = ins.address
  console.log('FACTORY_ADDRESS', FACTORY_ADDRESS)
}

async function initialize() {
    ins = new ethers.Contract(
      ONX_ADDRESS,
      ONXTestToken.abi,
      getWallet()
    )
    tx = await ins.transferOwnership(ONXFARM_ADDRESS, ETHER_SEND_CONFIG)
    console.log('ONX Token transferownership')
    await waitForMint(tx.hash)

    ins = new ethers.Contract(
        FACTORY_ADDRESS,
        ONXFactory.abi,
        getWallet()
      )
    tx = await ins.setupConfig(CONFIG_ADDRESS, ETHER_SEND_CONFIG)
    await waitForMint(tx.hash)

    ins = new ethers.Contract(
        PLATFORM_ADDRESS,
        ONXPlatform.abi,
        getWallet()
      )
    tx = await ins.setupConfig(CONFIG_ADDRESS, ETHER_SEND_CONFIG)
    await waitForMint(tx.hash)

    ins = new ethers.Contract(
        CONFIG_ADDRESS,
        ONXConfig.abi,
        getWallet()
      )
    tx = await ins.initialize(
        PLATFORM_ADDRESS,
        FACTORY_ADDRESS,
        ONX_ADDRESS,
        WETH_ADDRESS,
        ETHER_SEND_CONFIG
    )
    console.log('ONXConfig initialize')
    await waitForMint(tx.hash)

    tx = await ins.initParameter(ETHER_SEND_CONFIG)
    console.log('ONXConfig initParameter')
    await waitForMint(tx.hash)

    // tx = await ins.addMintToken(LEND_TOKEN_ADDRESS, ETHER_SEND_CONFIG)
    // console.log('ONXConfig addMintToken')
    // await waitForMint(tx.hash)

    tx = await ins.setWallets(
        [
            ethers.utils.formatBytes32String("team"), 
            ethers.utils.formatBytes32String("spare"), 
            ethers.utils.formatBytes32String("reward"), 
            ethers.utils.formatBytes32String("price")
        ], 
        [
            config.walletTeam, 
            config.walletSpare, 
            config.walletTeam, // need to remove
            config.walletPrice
        ],
        ETHER_SEND_CONFIG
    )
    console.log('ONXConfig setWallets')
    await waitForMint(tx.hash)

    // for pool
    // ins = new ethers.Contract(
    //     COLLATERAL_TOKEN_ADDRESS,
    //     UNIPAIR.abi,
    //     getWallet()
    //   )
    // tx = await ins.initialize(WBTC_TOKEN_ADDRESS, LEND_TOKEN_ADDRESS, ETHER_SEND_CONFIG)
    // console.log('UNIPAIR initialize')
    // await waitForMint(tx.hash)
    // tx = await ins.mint(config.walletDev, '100000000000000000000000000', ETHER_SEND_CONFIG)
    // console.log('UNIPAIR mint')
    // await waitForMint(tx.hash)

    ins = new ethers.Contract(
        ONXFARM_ADDRESS,
        ONXTestFarm.abi,
        getWallet()
      )
    tx = await ins.add(100, COLLATERAL_TOKEN_ADDRESS, false, ETHER_SEND_CONFIG)
    console.log('ONXFarm add')
    await waitForMint(tx.hash)

    console.log('LEND_TOKEN_ADDRESS', LEND_TOKEN_ADDRESS)
    console.log('COLLATERAL_TOKEN_ADDRESS', COLLATERAL_TOKEN_ADDRESS)

  // AETH POOL
  factory = new ethers.ContractFactory(
    ONXPool.abi,
    ONXPool.bytecode,
    walletWithProvider
  )

  ins = await upgrades.deployProxy(factory, [FACTORY_ADDRESS])

  await waitForMint(ins.deployTransaction.hash)
  AETH_POOL_ADDRESS = ins.address
  console.log('AETH_POOL_ADDRESS', AETH_POOL_ADDRESS)

  ins = new ethers.Contract(
      FACTORY_ADDRESS,
      ONXFactory.abi,
      getWallet()
    )
    tx = await ins.createPool(AETH_POOL_ADDRESS, LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS, ETHER_SEND_CONFIG)
    console.log('ONXFactory createPool AETH', LEND_TOKEN_ADDRESS)
    await waitForMint(tx.hash)
    let poolAddr = await ins.getPool(LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS)
    console.log('pool address:', poolAddr)

    factory = new ethers.ContractFactory(
      ONXStrategyCollateral.abi,
      ONXStrategyCollateral.bytecode,
      walletWithProvider
    )
    ins = await factory.deploy(ETHER_SEND_CONFIG)
    console.log('ONXCollateralStrategy deploy')
    await waitForMint(ins.deployTransaction.hash)
    STRATEGY_ADDRESS = ins.address
    tx = await ins.initialize(ONX_ADDRESS, COLLATERAL_TOKEN_ADDRESS, poolAddr, ONXFARM_ADDRESS, 0, ETHER_SEND_CONFIG)
    console.log('ONXStrategy ONXCollateralStrategy')
    await waitForMint(tx.hash)

    ins = new ethers.Contract(
        PLATFORM_ADDRESS,
        ONXPlatform.abi,
        getWallet()
      )
    tx = await ins.setCollateralStrategy(LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS, STRATEGY_ADDRESS, ETHER_SEND_CONFIG)
    console.log('ONXPlatform setCollateralStrategy')
    await waitForMint(tx.hash)


    console.log('transfer...')
    // await transfer()
}

async function transfer() {
    // ins = new ethers.Contract(
    //     REWARD_TOKEN_ADDRESS,
    //     ERC20.abi,
    //     getWallet()
    //   )
    // tx = await ins.transfer(MASTERCHEF_ADDRESS, '5000000000000000000000', ETHER_SEND_CONFIG)
    // await waitForMint(tx.hash)

    // for(let user of config.users) {
    //     ins = new ethers.Contract(
    //         LEND_TOKEN_ADDRESS,
    //         ERC20.abi,
    //         getWallet()
    //       )
    //     tx = await ins.transfer(user, '5000000000000000000000', ETHER_SEND_CONFIG)
    //     await waitForMint(tx.hash)

    //     ins = new ethers.Contract(
    //         COLLATERAL_TOKEN_ADDRESS,
    //         UNIPAIR.abi,
    //         getWallet()
    //       )
    //     tx = await ins.mint(user, '5000000000000000000000', ETHER_SEND_CONFIG)
    //     await waitForMint(tx.hash)
    // }
}

async function main() {
    console.log('deploy...')
    await deploy()
    console.log('initialize...')
    await initialize()
    console.log(`
    ONX_ADDRESS = ${ONX_ADDRESS}
    PLATFORM_ADDRESS = ${PLATFORM_ADDRESS}
    CONFIG_ADDRESS = ${CONFIG_ADDRESS}
    FACTORY_ADDRESS = ${FACTORY_ADDRESS}

    ===============================
    ONXFARM_ADDRESS = ${ONXFARM_ADDRESS}
    STRATEGY_ADDRESS = ${STRATEGY_ADDRESS}
    
    LEND_TOKEN_ADDRESS = ${LEND_TOKEN_ADDRESS}
    COLLATERAL_TOKEN_ADDRESS = ${COLLATERAL_TOKEN_ADDRESS}
    `)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });