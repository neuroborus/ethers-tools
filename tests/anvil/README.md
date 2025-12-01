# Anvil Testing

## Quickstart

- `npm run test:anvil`

If you want to run local tests, you will need a few items:

### Foundry & anvil

- Requires [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Manual deployment

In case you don't want to use prepared `./anvil-state.json`, you can deploy it yourself.

### Needed Tools

First, make sure you have the following:

- Cloned [Multicall3](https://github.com/mds1/multicall3)

### Infrastructure

- Run anvil
- Build [SimpleStorage](SimpleStorage):

```shell
cd ./SimpleStorage
forge init --force
forge build
```

- Deploy [SimpleStorage](SimpleStorage):

```shell
forge create --rpc-url http://127.0.0.1:8545   --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  src/SimpleStorage.sol:SimpleStorage  --broadcast
```

- Deploy [Multicall3](https://github.com/mds1/multicall3):

```shell
forge create --rpc-url http://127.0.0.1:8545   --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  src/Multicall3.sol:Multicall3   --broadcast
```

### Mock

Update [local mock](anvil.mock.js) with the deployed contract addresses and private key used.

That's all!
