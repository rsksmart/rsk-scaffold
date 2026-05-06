import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployExampleTarget: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const forwarder = await hre.ethers.getContract<Contract>("OZForwarder", deployer);
  const forwarderAddress = await forwarder.getAddress();

  await deploy("ExampleTarget", {
    from: deployer,
    args: [forwarderAddress],
    log: true,
    autoMine: true,
  });

  const exampleTarget = await hre.ethers.getContract<Contract>("ExampleTarget", deployer);
  console.log("✅ ExampleTarget deployed at:", await exampleTarget.getAddress());
  console.log("   Trusted Forwarder (OZForwarder):", forwarderAddress);
};

export default deployExampleTarget;

deployExampleTarget.tags = ["ExampleTarget"];
deployExampleTarget.dependencies = ["OZForwarder"];
