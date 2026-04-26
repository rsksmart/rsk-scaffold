import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the SimpleDAO contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deploySimpleDAO: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("SimpleDAO", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await hre.ethers.getContract<Contract>("SimpleDAO", deployer);
  console.log("🗳️  SimpleDAO deployed");
};

export default deploySimpleDAO;

deploySimpleDAO.tags = ["SimpleDAO", "examples"];