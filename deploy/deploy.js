let fs = require("fs");
let path = require("path");
const { ethers, upgrades } = require("hardhat");
// const ERC20 = require("../artifacts/contracts/test/ERC20TOKEN.sol/ERC20TOKEN.json")
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

let PAYOUT_ADDRESS = ""

const loadJsonFile = require('load-json-file');
let keys = loadJsonFile.sync('./keys.json');
const network = keys.network;
const { infuraKey, deployer, privateKey, payout } = keys.networks[network];
const url = (network === 'hardhat' ? `http://127.0.0.1:8545` : `https://${network}.infura.io/v3/${infuraKey}`)

const config = {
    "url": url,
    "pk": privateKey,
    "gasPrice": "80",
    "walletDev": deployer,
    "walletTeam": deployer,
    "walletSpare": deployer,
    "walletPrice": deployer,
    "walletPayout": payout,
    "users":[deployer],
    "weth_address": deployer,
}

WETH_ADDRESS = config.weth_address
PAYOUT_ADDRESS = config.walletPayout;

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
  let factory = null, ins = null, tx = null;

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

  // ONX token transferownership
  ins = new ethers.Contract(
    ONX_ADDRESS,
    ONXTestToken.abi,
    getWallet()
  )
  tx = await ins.transferOwnership(ONXFARM_ADDRESS, ETHER_SEND_CONFIG)  
  await waitForMint(tx.hash)
  console.log('ONX Token transferownershipped')

  ins = new ethers.Contract(
    ONXFARM_ADDRESS,
    ONXTestFarm.abi,
    getWallet()
  )
  tx = await ins.add(20, AETH_ADDRESS, false, ETHER_SEND_CONFIG)  
  await waitForMint(tx.hash)
  console.log('AETH POOL added in onx farm')

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

  // PLATFORM
  factory = new ethers.ContractFactory(
    ONXPlatform.abi,
    ONXPlatform.bytecode,
    walletWithProvider
  )
  // ins = await upgrades.deployProxy(factory, [])
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  PLATFORM_ADDRESS = ins.address
  console.log('PLATFORM_ADDRESS', PLATFORM_ADDRESS)

  // Config initialize and setWallets
  ins = new ethers.Contract(
    CONFIG_ADDRESS,
    ONXConfig.abi,
    getWallet()
  )
  tx = await ins.initialize(PLATFORM_ADDRESS, FACTORY_ADDRESS, ONX_ADDRESS, WETH_ADDRESS, ETHER_SEND_CONFIG)  
  await waitForMint(tx.hash)
  console.log('ONX Config initialized')
  tx = await ins.setWallets(
    [
        ethers.utils.formatBytes32String("team"), 
        ethers.utils.formatBytes32String("spare"), 
        ethers.utils.formatBytes32String("price")
    ], 
    [
        config.walletTeam,
        config.walletSpare,
        config.walletPrice
    ],
    ETHER_SEND_CONFIG
  )
  console.log('ONXConfig setWallets')
  await waitForMint(tx.hash)

  // Factory initialize
  ins = new ethers.Contract(
    FACTORY_ADDRESS,
    ONXFactory.abi,
    getWallet()
  )      
  tx = await ins.initialize(ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONXFactory initialized')
  tx = await ins.setupConfig(CONFIG_ADDRESS, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONXPlatform setConfig')

  // Platform initialize
  ins = new ethers.Contract(
    PLATFORM_ADDRESS,
    ONXPlatform.abi,
    getWallet()
  )      
  tx = await ins.initialize(PAYOUT_ADDRESS, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONXPlatform initialized')
  tx = await ins.setupConfig(CONFIG_ADDRESS, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONXPlatform setConfig')

  // ONX Pool contract
  factory = new ethers.ContractFactory(
    ONXPool.abi,
    ONXPool.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  AETH_POOL_ADDRESS = ins.address

  // ONX Pool initialize
  ins = new ethers.Contract(
    AETH_POOL_ADDRESS,
    ONXPool.abi,
    getWallet()
  )      
  tx = await ins.initialize(FACTORY_ADDRESS, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONX pool initialized')

  ins = new ethers.Contract(
    FACTORY_ADDRESS,
    ONXFactory.abi,
    getWallet()
  )      
  tx = await ins.createPool(AETH_POOL_ADDRESS, LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONXFactory created pool')

  // ONX strategy contract
  factory = new ethers.ContractFactory(
    ONXStrategyCollateral.abi,
    ONXStrategyCollateral.bytecode,
    walletWithProvider
  )
  ins = await factory.deploy(ETHER_SEND_CONFIG)
  await waitForMint(ins.deployTransaction.hash)
  STRATEGY_ADDRESS = ins.address
  console.log('STRATEGY_ADDRESS >> ', STRATEGY_ADDRESS)

  // onx strategy initialize
  ins = new ethers.Contract(
    STRATEGY_ADDRESS,
    ONXStrategyCollateral.abi,
    getWallet()
  )      
  tx = await ins.initialize(ONX_ADDRESS, COLLATERAL_TOKEN_ADDRESS, AETH_POOL_ADDRESS, ONXFARM_ADDRESS, 0, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONX strategy initialized')

  // ONX Platform set strategy
  ins = new ethers.Contract(
    PLATFORM_ADDRESS,
    ONXPlatform.abi,
    getWallet()
  )      
  tx = await ins.setCollateralStrategy(LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS, STRATEGY_ADDRESS, ETHER_SEND_CONFIG)
  await waitForMint(tx.hash)
  console.log('ONXPlatform setCollateralStrategy')
}

async function main() {
    console.log('deploy...')
    await deploy()
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