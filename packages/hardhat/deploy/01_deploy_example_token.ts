import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the ExampleToken contract with a fixed initial supply
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployExampleToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy with 1,000,000 tokens (18 decimals)
  const initialSupply = hre.ethers.parseUnits("1000000", 18);

  await deploy("ExampleToken", {
    from: deployer,
    args: [initialSupply],
    log: true,
    autoMine: true,
  });

  await hre.ethers.getContract<Contract>("ExampleToken", deployer);
  console.log("💰 ExampleToken deployed with initial supply:", hre.ethers.formatUnits(initialSupply, 18));
};

export default deployExampleToken;

deployExampleToken.tags = ["ExampleToken", "examples"];