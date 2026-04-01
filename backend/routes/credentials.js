const express = require("express");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const { adminAuth } = require("../middleware/auth");
const { getContract } = require("../config/contract");
const ipfsService = require("../services/ipfs");

const router = express.Router();

// ──────────────── Auth Route ────────────────

/**
 * POST /api/auth/login
 * Admin login → returns JWT token.
 */
router.post("/auth/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        const token = jwt.sign(
            { username, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.json({
            token,
            expiresIn: 3600,
            message: "Login successful",
        });
    }

    res.status(401).json({ error: "Invalid credentials" });
});

// ──────────────── Issue Credential ────────────────

/**
 * POST /api/credentials/issue
 * Body: { holderAddress, studentName, degree, institution, graduationDate }
 * Issues a new SBT and pins credential to IPFS.
 */
router.post("/credentials/issue", adminAuth, async (req, res) => {
    try {
        const { holderAddress, studentName, degree, institution, graduationDate } =
            req.body;

        // Validate
        if (!holderAddress || !studentName || !degree || !institution || !graduationDate) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (!ethers.isAddress(holderAddress)) {
            return res.status(400).json({ error: "Invalid wallet address" });
        }

        // Build credential document (goes to IPFS, NOT on-chain)
        const credentialDoc = {
            studentName,
            degree,
            institution,
            graduationDate,
            issuedBy: req.user.username,
            issuedAt: new Date().toISOString(),
        };

        // Pin to IPFS (or get mock hash)
        const { ipfsHash, credentialHash } =
            await ipfsService.pinCredential(credentialDoc);

        // Convert credentialHash to bytes32 for contract
        const bytes32Hash = ethers.keccak256(ethers.toUtf8Bytes(credentialHash));

        // Issue on-chain
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const { contract } = getContract(
            provider,
            process.env.DEPLOYER_PRIVATE_KEY,
            process.env.CONTRACT_ADDRESS
        );

        const tx = await contract.issueCredential(
            holderAddress,
            bytes32Hash,
            ipfsHash
        );
        const receipt = await tx.wait();

        // Parse event to get tokenId
        const event = receipt.logs.find((log) => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed.name === "CredentialIssued";
            } catch {
                return false;
            }
        });

        const parsedEvent = contract.interface.parseLog(event);
        const tokenId = parsedEvent.args.tokenId.toString();

        res.status(201).json({
            success: true,
            tokenId,
            holderAddress,
            ipfsHash,
            credentialHash: bytes32Hash,
            transactionHash: receipt.hash,
        });
    } catch (err) {
        console.error("Issue error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────── Revoke Credential ────────────────

/**
 * POST /api/credentials/revoke/:tokenId
 */
router.post("/credentials/revoke/:tokenId", adminAuth, async (req, res) => {
    try {
        const { tokenId } = req.params;

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const { contract } = getContract(
            provider,
            process.env.DEPLOYER_PRIVATE_KEY,
            process.env.CONTRACT_ADDRESS
        );

        const tx = await contract.revokeCredential(tokenId);
        const receipt = await tx.wait();

        res.json({
            success: true,
            tokenId,
            transactionHash: receipt.hash,
            message: "Credential revoked successfully",
        });
    } catch (err) {
        console.error("Revoke error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────── Re-issue Credential ────────────────

/**
 * POST /api/credentials/reissue/:tokenId
 * Body: { holderAddress, studentName, degree, institution, graduationDate }
 * Mints a NEW token linked to the old revoked one.
 */
router.post("/credentials/reissue/:tokenId", adminAuth, async (req, res) => {
    try {
        const oldTokenId = req.params.tokenId;
        const { holderAddress, studentName, degree, institution, graduationDate } =
            req.body;

        if (!holderAddress || !studentName || !degree || !institution || !graduationDate) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Build + pin new credential doc
        const credentialDoc = {
            studentName,
            degree,
            institution,
            graduationDate,
            reissuedFrom: oldTokenId,
            issuedBy: req.user.username,
            issuedAt: new Date().toISOString(),
        };

        const { ipfsHash, credentialHash } =
            await ipfsService.pinCredential(credentialDoc);
        const bytes32Hash = ethers.keccak256(ethers.toUtf8Bytes(credentialHash));

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const { contract } = getContract(
            provider,
            process.env.DEPLOYER_PRIVATE_KEY,
            process.env.CONTRACT_ADDRESS
        );

        const tx = await contract.reissueCredential(
            oldTokenId,
            holderAddress,
            bytes32Hash,
            ipfsHash
        );
        const receipt = await tx.wait();

        // Parse event to get new tokenId
        const event = receipt.logs.find((log) => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed.name === "CredentialReissued";
            } catch {
                return false;
            }
        });

        const parsedEvent = contract.interface.parseLog(event);
        const newTokenId = parsedEvent.args.newTokenId.toString();

        res.status(201).json({
            success: true,
            newTokenId,
            oldTokenId,
            holderAddress,
            ipfsHash,
            transactionHash: receipt.hash,
        });
    } catch (err) {
        console.error("Reissue error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────── Verify Credential (Public) ────────────────

/**
 * GET /api/credentials/verify/:tokenId
 * Public endpoint — no auth required.
 */
router.get("/credentials/verify/:tokenId", async (req, res) => {
    try {
        const { tokenId } = req.params;

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const { contract } = getContract(
            provider,
            process.env.DEPLOYER_PRIVATE_KEY,
            process.env.CONTRACT_ADDRESS
        );

        const result = await contract.verifyCredential(tokenId);

        let ipfsData = {};
        if (result.ipfsHash) {
            const data = await ipfsService.getCredential(result.ipfsHash);
            if (data) ipfsData = data;
        }

        res.json({
            tokenId,
            holder: result.holder,
            credentialHash: result.credentialHash,
            ipfsHash: result.ipfsHash,
            issueTimestamp: Number(result.issueTimestamp),
            issuedAt: new Date(Number(result.issueTimestamp) * 1000).toISOString(),
            isRevoked: result.isRevoked,
            reissuedFrom: Number(result.reissuedFrom),
            ...ipfsData
        });
    } catch (err) {
        console.error("Verify error:", err);
        res.status(404).json({ error: "Credential not found or does not exist" });
    }
});

// ──────────────── Get by Holder (Public) ────────────────

/**
 * GET /api/credentials/holder/:address
 */
router.get("/credentials/holder/:address", async (req, res) => {
    try {
        const { address } = req.params;

        if (!ethers.isAddress(address)) {
            return res.status(400).json({ error: "Invalid wallet address" });
        }

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const { contract } = getContract(
            provider,
            process.env.DEPLOYER_PRIVATE_KEY,
            process.env.CONTRACT_ADDRESS
        );

        const tokenIds = await contract.getCredentialsByHolder(address);
        const credentials = [];

        for (const id of tokenIds) {
            try {
                const result = await contract.verifyCredential(id);
                
                let ipfsData = {};
                if (result.ipfsHash) {
                    const data = await ipfsService.getCredential(result.ipfsHash);
                    if (data) ipfsData = data;
                }

                credentials.push({
                    tokenId: Number(id),
                    holder: result.holder,
                    credentialHash: result.credentialHash,
                    ipfsHash: result.ipfsHash,
                    issueTimestamp: Number(result.issueTimestamp),
                    issuedAt: new Date(Number(result.issueTimestamp) * 1000).toISOString(),
                    isRevoked: result.isRevoked,
                    reissuedFrom: Number(result.reissuedFrom),
                    ...ipfsData
                });
            } catch {
                // skip tokens that might have issues
            }
        }

        res.json({ address, totalCredentials: credentials.length, credentials });
    } catch (err) {
        console.error("Holder lookup error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ──────────────── List All (Admin, Paginated) ────────────────

/**
 * GET /api/credentials/all?page=1&limit=20
 * Admin-only, paginated.
 */
router.get("/credentials/all", adminAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const { contract } = getContract(
            provider,
            process.env.DEPLOYER_PRIVATE_KEY,
            process.env.CONTRACT_ADDRESS
        );

        const total = Number(await contract.totalCredentials());
        const startId = (page - 1) * limit + 1;
        const endId = Math.min(page * limit, total);

        const credentials = [];
        for (let id = startId; id <= endId; id++) {
            try {
                const result = await contract.verifyCredential(id);
                
                let ipfsData = {};
                if (result.ipfsHash) {
                    const data = await ipfsService.getCredential(result.ipfsHash);
                    if (data) ipfsData = data;
                }

                credentials.push({
                    tokenId: id,
                    holder: result.holder,
                    credentialHash: result.credentialHash,
                    ipfsHash: result.ipfsHash,
                    issueTimestamp: Number(result.issueTimestamp),
                    issuedAt: new Date(Number(result.issueTimestamp) * 1000).toISOString(),
                    isRevoked: result.isRevoked,
                    reissuedFrom: Number(result.reissuedFrom),
                    ...ipfsData
                });
            } catch {
                // skip
            }
        }

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            credentials,
        });
    } catch (err) {
        console.error("List all error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
