# onx-lending-contract

## Prerequestis

1. Install hardhat environment.
2. Setup key, network info. Copy `keys.json.example` to `keys.json` and add proper values.
3. For localtest, run hardhat node using `npx hardhat node`
4. Setup deploy configuration on `deploy/deploy.js`

```
npm install
```

## How to compile?

```
npm run compile
```

or

```
npx hardhat compile
```

## How to run node?

```
npx hardhat node
```

## How to test?

```
npm run test
```

or

```
npx hardhat test
```


## How to deploy?

### local

```
npx hardhat run --network hardhat deploy/deploy.js
```

or

```
npx hardhat deploy-hardhat
```

### ropsten

```
npx hardhat run --network ropsten deploy/deploy.js
```

or

```
npx hardhat deploy-ropsten
```
