const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

/**
 * Load the SoulboundToken contract ABI from the Hardhat compilation output
 * and create an ethers.js Contract instance connected to the deployer wallet.
 */
function getContract(provider, privateKey, contractAddress) {
    // Load ABI from Hardhat artifacts
    const artifactPath = path.join(
        __dirname,
        "..",
        "..",
        "contracts",
        "artifacts",
        "contracts",
        "SoulboundToken.sol",
        "SoulboundToken.json"
    );

    if (!fs.existsSync(artifactPath)) {
        throw new Error(
            `Contract artifact not found at ${artifactPath}. ` +
            "Run 'npx hardhat compile' in the contracts/ directory first."
        );
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

    return { contract, wallet, abi: artifact.abi };
}

/**
 * Get a read-only contract instance (no wallet needed).
 */
function getReadOnlyContract(provider, contractAddress) {
    const artifactPath = path.join(
        __dirname,
        "..",
        "..",
        "contracts",
        "artifacts",
        "contracts",
        "SoulboundToken.sol",
        "SoulboundToken.json"
    );

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return new ethers.Contract(contractAddress, artifact.abi, provider);
}

module.exports = { getContract, getReadOnlyContract };
