import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const { deployments, getNamedAccounts, ethers, network } = hre;
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();

	log(`Deploying example contracts with deployer: ${deployer} on ${network.name}`);

	// TokenDemo (ERC20)
	const token = await deploy("TokenDemo", {
		from: deployer,
		args: [],
		log: true,
		autoMine: true,
	});

	// NftDemo (ERC721) with a basic placeholder baseURI
	const nftBaseUri = "ipfs://demo-metadata/";
	await deploy("NftDemo", {
		from: deployer,
		args: [nftBaseUri],
		log: true,
		autoMine: true,
	});

	// SimpleDao (no token weighting by default -> address(0))
	await deploy("SimpleDao", {
		from: deployer,
		args: [ethers.ZeroAddress],
		log: true,
		autoMine: true,
	});

	log("Example contracts deployed.");
};

export default func;
func.tags = ["Examples"];

