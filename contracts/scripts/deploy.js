const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying SoulboundToken with account:", deployer.address);

    const SoulboundToken = await ethers.getContractFactory("SoulboundToken");
    const sbt = await SoulboundToken.deploy();
    await sbt.waitForDeployment();

    const address = await sbt.getAddress();
    console.log("SoulboundToken deployed to:", address);

    // Write address to a file for backend/frontend to read
    const fs = require("fs");
    const path = require("path");

    const deploymentInfo = {
        address: address,
        deployer: deployer.address,
        network: hre.network.name,
        timestamp: new Date().toISOString(),
    };

    const outDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(
        path.join(outDir, "localhost.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployments/localhost.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
