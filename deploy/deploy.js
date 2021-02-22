let fs = require("fs");
let path = require("path");
const hardhat = require("hardhat");
const {ethers, upgrades, network} = hardhat

// const ERC20 = require("../artifacts/contracts/test/ERC20TOKEN.sol/ERC20TOKEN.json")
const WETH = require("../artifacts/contracts/weth/WETH.sol/WETH9.json")
const AETH = require("../artifacts/contracts/test/AETH.sol/AETH.json")
const ONXConfig = require("../artifacts/contracts/ONXConfig.sol/ONXConfig.json")
const ONXPlatform = require("../artifacts/contracts/ONXPlatform.sol/ONXPlatform.json")
const ONXPool = require("../artifacts/contracts/ONX.sol/ONXPool.json")
const ONXFactory = require("../artifacts/contracts/ONXFactory.sol/ONXFactory.json")
const ONXStrategy = require("../artifacts/contracts/ONXStrategy.sol/ONXStrategy.json")
const ONXSupplyToken = require("../artifacts/contracts/ONXSupplyToken.sol/ONXSupplyToken.json")
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
let ONX_SUPPLY_TOKEN_ADDRESS = ""

let ONXFARM_ADDRESS = ""
let COLLATERAL_STRATEGY_ADDRESS = ""
let SUPPLY_STRATEGY_ADDRESS = ""

const loadJsonFile = require('load-json-file');
let keys = loadJsonFile.sync('./keys.json');

const { payout, weth, deployer } = keys.networks[network.name];

WETH_ADDRESS = weth
PAYOUT_ADDRESS = payout
const provider = network.name === 'hardhat' ? ethers.provider : ethers.getDefaultProvider( network.name)
const config = {
  "gasPrice": "80",
  "walletDev": deployer,
  "walletTeam": deployer,
  "walletSpare": deployer,
  "walletPrice": deployer
}

if (fs.existsSync(path.join(__dirname, ".config.json"))) {
  let _config = JSON.parse(fs.readFileSync(path.join(__dirname, ".config.json")).toString());
  for (let k in config) {
    config[k] = _config[k];
  }
}

console.log("CURRENT NETWORK", network.name);

let signer;
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
  factory = await ethers.getContractFactory("ONXTestToken")
  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  ONX_ADDRESS = ins.address

  // ONX Farm
  factory = await ethers.getContractFactory("ONXTestFarm")

  ins = await factory.deploy(ONX_ADDRESS, config.walletTeam, config.walletSpare)
  await waitForMint(ins.deployTransaction.hash)
  ONXFARM_ADDRESS = ins.address

  // AETH Token
  factory = await ethers.getContractFactory("AETH")
  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  AETH_ADDRESS = ins.address

  // ONX token transferownership
  ins = new ethers.Contract(
    ONX_ADDRESS,
    ONXTestToken.abi,
    signer
  )
  tx = await ins.transferOwnership(ONXFARM_ADDRESS)
  await waitForMint(tx.hash)
  console.log('ONX Token transferownershipped')

  ins = new ethers.Contract(
    ONXFARM_ADDRESS,
    ONXTestFarm.abi,
    signer
  )
  tx = await ins.add(20, AETH_ADDRESS, false)
  await waitForMint(tx.hash)
  console.log('AETH POOL added in onx farm')

  // WETH Token
  factory = new ethers.ContractFactory(
    WETH.abi,
    WETH.bytecode,
    signer
  )
  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  WETH_ADDRESS = ins.address

  COLLATERAL_TOKEN_ADDRESS = AETH_ADDRESS
  LEND_TOKEN_ADDRESS = WETH_ADDRESS

  /********************************** */

  // ONX Supply Token
  factory = await ethers.getContractFactory("ONXSupplyToken")
  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  ONX_SUPPLY_TOKEN_ADDRESS = ins.address

  // ONX Farm add onx supply token pool # should remove on mainnet
  ins = new ethers.Contract(
    ONXFARM_ADDRESS,
    ONXTestFarm.abi,
    signer
  )
  tx = await ins.add(20, ONX_SUPPLY_TOKEN_ADDRESS, false)
  await waitForMint(tx.hash)
  // console.log('ONX SUPPLY TOKEN POOL added in onx farm')

  // CONFIG
  factory = await ethers.getContractFactory("ONXConfig")

  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  CONFIG_ADDRESS = ins.address
  console.log('CONFIG_ADDRESS', CONFIG_ADDRESS)

  // FACTORY
  factory = await ethers.getContractFactory("ONXFactory")
  // ins = await upgrades.deployProxy(factory, [])
  ins = await factory.deploy()
  // ins = await ins.deployed();
  await waitForMint(ins.deployTransaction.hash)

  FACTORY_ADDRESS = ins.address
  // console.log('FACTORY_ADDRESS', FACTORY_ADDRESS)

  ins = new ethers.Contract(
    FACTORY_ADDRESS,
    ONXFactory.abi,
    signer
  )
  tx = await ins.initialize()
  await waitForMint(tx.hash)
  console.log('factory initialized')

  // PLATFORM
  factory = await ethers.getContractFactory("ONXPlatform")

  // ins = await upgrades.deployProxy(factory, [])
  ins = await factory.deploy()
  // await ins.deployed()

  await waitForMint(ins.deployTransaction.hash)

  PLATFORM_ADDRESS = ins.address
  console.log('PLATFORM_ADDRESS', PLATFORM_ADDRESS)

  ins = new ethers.Contract(
    PLATFORM_ADDRESS,
    ONXPlatform.abi,
    signer
  )
  tx = await ins.initialize(PAYOUT_ADDRESS, ONX_SUPPLY_TOKEN_ADDRESS)
  await waitForMint(tx.hash)

  // ONX Supply token transferownership
  ins = new ethers.Contract(
    ONX_SUPPLY_TOKEN_ADDRESS,
    ONXSupplyToken.abi,
    signer
  )
  tx = await ins.transferOwnership(PLATFORM_ADDRESS)
  await waitForMint(tx.hash)
  console.log('ONX Supply Token transferownershipped')

  // platform config
  ins = new ethers.Contract(
    PLATFORM_ADDRESS,
    ONXFactory.abi,
    signer
  )
  tx = await ins.setupConfig(CONFIG_ADDRESS)
  await waitForMint(tx.hash)
  // console.log('ONXPlatform setConfig')

  ins = new ethers.Contract(
    FACTORY_ADDRESS,
    ONXFactory.abi,
    signer
  )
  tx = await ins.setupConfig(CONFIG_ADDRESS)
  await waitForMint(tx.hash)
  // console.log('ONXFactory setConfig')

  // Config initialize and setWallets
  ins = new ethers.Contract(
    CONFIG_ADDRESS,
    ONXConfig.abi,
    signer
  )
  tx = await ins.initialize(PLATFORM_ADDRESS, FACTORY_ADDRESS, ONX_ADDRESS, WETH_ADDRESS)
  await waitForMint(tx.hash)
  // console.log('ONX Config initialized')
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
  )
  console.log('ONXConfig setWallets')
  await waitForMint(tx.hash)


  // ONX Pool contract
  factory = await ethers.getContractFactory("ONXPool")

  // ins = await upgrades.deployProxy(factory, [FACTORY_ADDRESS])
  ins = await factory.deploy()
  // await ins.deployed()
  await waitForMint(ins.deployTransaction.hash)

  AETH_POOL_ADDRESS = ins.address

  ins = new ethers.Contract(
    AETH_POOL_ADDRESS,
    ONXPool.abi,
    signer
  )
  tx = await ins.initialize(FACTORY_ADDRESS)

  await waitForMint(tx.hash)
  console.log('Pool initialized')

  ins = new ethers.Contract(
    FACTORY_ADDRESS,
    ONXFactory.abi,
    signer
  )
  tx = await ins.createPool(AETH_POOL_ADDRESS, LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS)
  await waitForMint(tx.hash)
  console.log('ONXFactory created pool')

  // ONX collateral strategy contract
  factory = new ethers.ContractFactory(
    ONXStrategy.abi,
    ONXStrategy.bytecode,
    signer
  )
  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  COLLATERAL_STRATEGY_ADDRESS  = ins.address
  console.log('COLLATERAL_STRATEGY_ADDRESS  >> ', COLLATERAL_STRATEGY_ADDRESS )

  // onx strategy initialize
  ins = new ethers.Contract(
    COLLATERAL_STRATEGY_ADDRESS,
    ONXStrategy.abi,
    signer
  )
  tx = await ins.initialize(ONX_ADDRESS, COLLATERAL_TOKEN_ADDRESS, AETH_POOL_ADDRESS, ONXFARM_ADDRESS, 0)
  await waitForMint(tx.hash)
  console.log('ONX collateral strategy initialized')

  // ONX supply strategy contract
  factory = new ethers.ContractFactory(
    ONXStrategy.abi,
    ONXStrategy.bytecode,
    signer
  )
  ins = await factory.deploy()
  await waitForMint(ins.deployTransaction.hash)
  SUPPLY_STRATEGY_ADDRESS  = ins.address
  console.log('SUPPLY_STRATEGY_ADDRESS  >> ', SUPPLY_STRATEGY_ADDRESS )

  // onx supply strategy initialize
  ins = new ethers.Contract(
    SUPPLY_STRATEGY_ADDRESS,
    ONXStrategy.abi,
    signer
  )
  tx = await ins.initialize(ONX_ADDRESS, ONX_SUPPLY_TOKEN_ADDRESS, AETH_POOL_ADDRESS, ONXFARM_ADDRESS, 1)
  await waitForMint(tx.hash)
  console.log('ONX supply strategy initialized')

  // ONX Platform set strategy
  ins = new ethers.Contract(
    PLATFORM_ADDRESS,
    ONXPlatform.abi,
    signer
  )
  tx = await ins.setCollateralStrategy(LEND_TOKEN_ADDRESS, COLLATERAL_TOKEN_ADDRESS, COLLATERAL_STRATEGY_ADDRESS, SUPPLY_STRATEGY_ADDRESS)
  await waitForMint(tx.hash)
  console.log('ONXPlatform setCollateralStrategy')
}

async function main() {
  console.log('deploy...')
  signer = (await ethers.getSigners())[0]

  await deploy()
  console.log(`
    ONXFARM_ADDRESS = ${ONXFARM_ADDRESS}
    ONX_ADDRESS = ${ONX_ADDRESS}
    ===============================
    PLATFORM_ADDRESS = ${PLATFORM_ADDRESS}
    CONFIG_ADDRESS = ${CONFIG_ADDRESS}
    FACTORY_ADDRESS = ${FACTORY_ADDRESS}
    ONX_SUPPLY_TOKEN_ADDRESS = ${ONX_SUPPLY_TOKEN_ADDRESS}
    AETH_POOL_ADDRESS = ${AETH_POOL_ADDRESS}

    ===============================    
    COLLATERAL_STRATEGY_ADDRESS = ${COLLATERAL_STRATEGY_ADDRESS}
    SUPPLY_STRATEGY_ADDRESS = ${SUPPLY_STRATEGY_ADDRESS}
    
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