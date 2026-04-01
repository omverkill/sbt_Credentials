const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MOCK_DB_PATH = path.join(__dirname, "..", "mock_ipfs.json");

/**
 * IPFS pinning service.
 *
 * In production, uses Pinata to pin JSON to IPFS.
 * In local dev (no Pinata keys), returns a mock CID based on content hash.
 */
class IPFSService {
    constructor() {
        this.pinataApiKey = process.env.PINATA_API_KEY;
        this.pinataSecret = process.env.PINATA_SECRET;
        this.isEnabled = !!(this.pinataApiKey && this.pinataSecret);

        if (!this.isEnabled) {
            console.log(
                "[IPFS] Pinata keys not configured. Running in mock mode — " +
                "credential documents will NOT be pinned to IPFS."
            );
            if (!fs.existsSync(MOCK_DB_PATH)) {
                fs.writeFileSync(MOCK_DB_PATH, JSON.stringify({}));
            }
        }
    }

    /**
     * Pin a credential JSON document to IPFS.
     * @param {object} credentialData  The full credential document.
     * @returns {{ ipfsHash: string, credentialHash: string }}
     */
    async pinCredential(credentialData) {
        const jsonString = JSON.stringify(credentialData, null, 2);
        const credentialHash =
            "0x" + crypto.createHash("sha256").update(jsonString).digest("hex");

        if (this.isEnabled) {
            return await this._pinToPinata(jsonString, credentialHash);
        }

        return this._mockPin(jsonString, credentialHash);
    }

    async _pinToPinata(jsonString, credentialHash) {
        // Dynamic import for fetch (Node 18+) or use built-in
        const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                pinata_api_key: this.pinataApiKey,
                pinata_secret_api_key: this.pinataSecret,
            },
            body: JSON.stringify({
                pinataContent: JSON.parse(jsonString),
                pinataMetadata: {
                    name: `sbt-credential-${Date.now()}`,
                },
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Pinata pinning failed: ${err}`);
        }

        const data = await response.json();
        return {
            ipfsHash: data.IpfsHash,
            credentialHash,
        };
    }

    _mockPin(jsonString, credentialHash) {
        // Generate a deterministic mock CID based on content
        const mockCid =
            "Qm" +
            crypto
                .createHash("sha256")
                .update(jsonString)
                .digest("hex")
                .substring(0, 44);

        console.log(`[IPFS Mock] Generated mock CID: ${mockCid}`);

        // Store internally for local dev fetching
        try {
            const db = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));
            db[mockCid] = JSON.parse(jsonString);
            fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(db, null, 2));
        } catch (e) {
            console.error("Failed to write to mock IPFS db", e);
        }

        return {
            ipfsHash: mockCid,
            credentialHash,
        };
    }

    /**
     * Fetch a credential JSON document from IPFS.
     * @param {string} ipfsHash 
     * @returns {object|null}
     */
    async getCredential(ipfsHash) {
        if (this.isEnabled) {
            try {
                const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
                if (response.ok) {
                    return await response.json();
                }
            } catch (e) {
                console.error("Failed to fetch from IPFS gateway", e);
            }
        } else {
            try {
                if (fs.existsSync(MOCK_DB_PATH)) {
                    const db = JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));
                    if (db[ipfsHash]) {
                        return db[ipfsHash];
                    }
                }
            } catch (e) {
                console.error("Failed to read from mock IPFS db", e);
            }
        }
        return null;
    }
}

module.exports = new IPFSService();
