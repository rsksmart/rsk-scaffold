import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the SimpleNFT contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deploySimpleNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("SimpleNFT", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await hre.ethers.getContract<Contract>("SimpleNFT", deployer);
  console.log("🖼️  SimpleNFT deployed");
};

export default deploySimpleNFT;

deploySimpleNFT.tags = ["SimpleNFT", "examples"];