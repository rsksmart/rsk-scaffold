import { deployments } from "hardhat";

async function main() {
  console.log("\n📋 Deployed Contract Addresses\n");
  console.log("================================\n");

  try {
    const forwarder = await deployments.get("OZForwarder");
    console.log("Forwarder:", forwarder.address);
  } catch {
    console.log("Forwarder: Not deployed");
  }

  try {
    const exampleTarget = await deployments.get("ExampleTarget");
    console.log("ExampleTarget:", exampleTarget.address);
  } catch {
    console.log("ExampleTarget: Not deployed");
  }

  try {
    const yourContract = await deployments.get("YourContract");
    console.log("YourContract:", yourContract.address);
  } catch {
    console.log("YourContract: Not deployed");
  }

  console.log("\n================================\n");
  console.log("Copy these addresses to:");
  console.log("- packages/relayer/.env");
  console.log("- packages/nextjs/.env.local");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
