# Mini dApp Examples

This repository includes three complete educational mini dApps demonstrating common blockchain development patterns on Rootstock.

## Examples Overview

### 1. Token Transfer dApp
A complete ERC-20 token implementation with transfer functionality.

**Location**: `/examples/token-transfer`

**Features**:
- Fixed-supply ERC-20 token (1,000,000 EXT)
- Transfer tokens from sender to any recipient
- Human-friendly amount input (automatically converts to wei)
- Real-time balance display
- Full test coverage

**Learn**:
- ERC-20 token standard
- Token transfers and balances
- Working with decimals and wei conversion
- Using OpenZeppelin contracts

---

### 2. NFT Minting dApp 
A simple ERC-721 NFT collection with minting capabilities.

**Location**: `/examples/nft-mint`

**Features**:
- ERC-721 NFT with auto-incrementing token IDs
- Mint NFTs to any address
- View NFT balances
- Track total supply
- Full test coverage

**Learn**:
- ERC-721 NFT standard
- NFT minting and ownership
- Difference between fungible and non-fungible tokens
- Safe minting patterns

---

### 3. DAO Voting dApp 
A minimal decentralized governance system.

**Location**: `/examples/dao-vote`

**Features**:
- Owner-managed voting power assignment
- Create and vote on proposals
- Weighted voting system
- Proposal execution when passed
- Prevent double voting
- Full test coverage

**Learn**:
- DAO governance patterns
- Voting mechanisms
- Proposal lifecycle
- Decentralized decision-making

---

##  Quick Start

### 1. Configure Environment Variables

Before deploying, you need to set up environment variables for both Hardhat and NextJS.

#### Hardhat Environment Variables

Copy the example file and fill in the required values:

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
```

Edit `packages/hardhat/.env` and set:

- **`DEPLOYER_PRIVATE_KEY`** (REQUIRED): Private key for deploying contracts
  - For local development: Use a test private key
  - Generate one with: `yarn generate`
  - **NEVER commit real private keys to version control**

- **`ROOTSTOCK_RPC_URL`** (REQUIRED): RPC endpoint for Rootstock network
  - Testnet: `https://rpc.testnet.rootstock.io/YOUR_API_KEY_HERE`
  - Mainnet: `https://rpc.mainnet.rootstock.io/YOUR_API_KEY_HERE`
  - Get API key from: https://rpc.rootstock.io/
  - Or use public endpoint: `https://public-node.testnet.rsk.co` (rate limited)

#### NextJS Environment Variables

Copy the example file and fill in the required values:

```bash
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

Edit `packages/nextjs/.env.local` and set:

- **`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`** (REQUIRED): For wallet connections
  - Get your project ID from: https://cloud.walletconnect.com
  - Default provided in `scaffold.config.ts` for development

- **`NEXT_PUBLIC_ROOTSTOCK_RPC_URL`** (REQUIRED): RPC endpoint for frontend
  - Same as Hardhat RPC URL
  - Must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser

### 2. Install Dependencies

```bash
yarn install
```

### 3. Start Local Blockchain (Optional)

For local development:

```bash
yarn chain
```

Or skip this step to deploy directly to Rootstock Testnet.

### 4. Deploy Contracts

In a new terminal:

```bash
# Deploy all example contracts to localhost
yarn deploy --tags examples

# Or deploy to Rootstock Testnet
yarn deploy --tags examples --network rootstockTestnet

# Or deploy individually
yarn deploy --tags ExampleToken
yarn deploy --tags SimpleNFT
yarn deploy --tags SimpleDAO
```

### 5. Start Frontend

```bash
yarn start
```

### 6. Access Examples

Navigate to:
- **Examples Index**: http://localhost:3000/examples
- **Token Transfer**: http://localhost:3000/examples/token-transfer
- **NFT Minting**: http://localhost:3000/examples/nft-mint
- **DAO Voting**: http://localhost:3000/examples/dao-vote

---

## Testing

### Run All Example Tests

```bash
yarn hardhat test test/examples/*.ts --network hardhat
```

### Run Individual Tests

```bash
yarn hardhat test test/examples/ExampleToken.ts --network hardhat
yarn hardhat test test/examples/SimpleNFT.ts --network hardhat
yarn hardhat test test/examples/SimpleDAO.ts --network hardhat
```

### Test Coverage

All examples include comprehensive test suites covering:
- ✅ Deployment and initialization
- ✅ Core functionality
- ✅ Access control
- ✅ Error handling
- ✅ Event emission
- ✅ Edge cases

---

##  Project Structure

```
packages/
├── hardhat/
│   ├── contracts/
│   │   └── examples/
│   │       ├── ExampleToken.sol      # ERC-20 token contract
│   │       ├── SimpleNFT.sol         # ERC-721 NFT contract
│   │       ├── SimpleDAO.sol         # DAO governance contract
│   │       └── README.md             # Contract documentation
│   ├── deploy/
│   │   ├── 01_deploy_example_token.ts
│   │   ├── 02_deploy_simple_nft.ts
│   │   └── 03_deploy_simple_dao.ts
│   └── test/
│       └── examples/
│           ├── ExampleToken.ts       # Token tests
│           ├── SimpleNFT.ts          # NFT tests
│           └── SimpleDAO.ts          # DAO tests
└── nextjs/
    └── app/
        └── examples/
            ├── page.tsx              # Examples index
            ├── token-transfer/
            │   └── page.tsx          # Token transfer UI
            ├── nft-mint/
            │   └── page.tsx          # NFT minting UI
            └── dao-vote/
                └── page.tsx          # DAO voting UI
```

---

## Technology Stack

### Smart Contracts
- **Solidity** ^0.8.19
- **OpenZeppelin Contracts** v5.0.2
- **Hardhat** for development and testing

### Frontend
- **Next.js 14** with App Router
- **React 18**
- **TypeScript**
- **Wagmi** for Ethereum interactions
- **RainbowKit** for wallet connections
- **TailwindCSS** + **DaisyUI** for styling

### Testing
- **Hardhat Chai Matchers**
- **Ethers.js v6**
- **TypeChain** for type-safe contracts

---
