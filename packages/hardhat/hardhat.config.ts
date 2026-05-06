import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

// Get deployer private key from environment variable
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

// Networks that are local-only and may safely run without an explicit
// DEPLOYER_PRIVATE_KEY (Hardhat ships its own deterministic test accounts).
const LOCAL_NETWORKS = new Set(["hardhat", "localhost"]);
const targetNetwork = process.env.HARDHAT_NETWORK;

// Hard-fail at config load when targeting any non-local network without
// DEPLOYER_PRIVATE_KEY. This prevents the previous footgun where a missing
// env var silently fell back to the universally-known Hardhat account-0
// key while pointed at a real network.
if (!deployerPrivateKey && targetNetwork && !LOCAL_NETWORKS.has(targetNetwork)) {
  throw new Error(
    `DEPLOYER_PRIVATE_KEY env var is required for network "${targetNetwork}". ` +
    "Set DEPLOYER_PRIVATE_KEY in packages/hardhat/.env before running this command.",
  );
}

// forking rpc url
const forkingURL = process.env.FORKING_URL || "";

// Rootstock RPC URL from environment variable
const rootstockRpcUrl = process.env.ROOTSTOCK_RPC_URL || "https://rpc.testnet.rootstock.io";

// Build the accounts list for non-local networks. We DO NOT fall back to
// the well-known Hardhat key here — if the env var is missing, the network
// has no signers, so any attempt to deploy/send a tx will fail explicitly
// rather than silently using a public key.
const remoteNetworkAccounts: string[] = deployerPrivateKey ? [deployerPrivateKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat", // Changed from "rootstockTestnet" for local development
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhat: {
      forking: {
        url: forkingURL,
        enabled: process.env.MAINNET_FORKING_ENABLED === "true",
      },
      saveDeployments: true,
    },
    rootstockTestnet: {
      url: rootstockRpcUrl,
      accounts: remoteNetworkAccounts,
      chainId: 31,
    },
  },
  // configuration for harhdat-verify plugin
  etherscan: {
    enabled: false,
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api.rootstock.io",
    browserUrl: "https://explorer.testnet.rootstock.io",
  },
};

export default config;
