import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys OpenZeppelin's ERC2771Forwarder contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployOZForwarder: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying OpenZeppelin ERC2771Forwarder (Primary Forwarder)...");

  const forwarderDeployment = await deploy("OZForwarder", {
    from: deployer,
    // Constructor args: name (string)
    args: ["RSKForwarder"],
    log: true,
    autoMine: true,
  });

  const ozForwarder = await hre.ethers.getContract<Contract>("OZForwarder", deployer);
  console.log("✅ Primary Forwarder (OpenZeppelin ERC2771) deployed to:", await ozForwarder.getAddress());

  // Get the deployed contract to interact with it after deploying
  const forwarder = await hre.ethers.getContractAt("OZForwarder", forwarderDeployment.address);

  console.log("📋 Forwarder details:");
  console.log("   - Address:", await forwarder.getAddress());

  // Get EIP712 domain info
  try {
    const domain = await forwarder.eip712Domain();
    console.log("   - EIP712 Domain:");
    console.log("     - Name:", domain.name);
    console.log("     - Version:", domain.version);
    console.log("     - ChainId:", domain.chainId.toString());
  } catch {
    console.log("   - EIP712 Domain: (unable to fetch)");
  }

  console.log("\n✅ OpenZeppelin ERC2771Forwarder deployment complete!\n");
};

export default deployOZForwarder;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags OZForwarder
deployOZForwarder.tags = ["OZForwarder"];
