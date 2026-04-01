const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoulboundToken", function () {
    let sbt, owner, holder, other;
    const IPFS_HASH = "QmTestHash1234567890abcdef";
    let credentialHash;

    beforeEach(async function () {
        [owner, holder, other] = await ethers.getSigners();
        const SoulboundToken = await ethers.getContractFactory("SoulboundToken");
        sbt = await SoulboundToken.deploy();
        await sbt.waitForDeployment();

        // Create a sample credential hash
        credentialHash = ethers.keccak256(
            ethers.toUtf8Bytes(
                JSON.stringify({
                    studentName: "Alice Smith",
                    degree: "B.Sc. Computer Science",
                    institution: "Test University",
                    graduationDate: "2024-06-15",
                })
            )
        );
    });

    // ──────────────── Deployment ────────────────

    describe("Deployment", function () {
        it("should set the correct name and symbol", async function () {
            expect(await sbt.name()).to.equal("AcademicSoulboundToken");
            expect(await sbt.symbol()).to.equal("ASBT");
        });

        it("should set deployer as owner", async function () {
            expect(await sbt.owner()).to.equal(owner.address);
        });

        it("should start with zero total credentials", async function () {
            expect(await sbt.totalCredentials()).to.equal(0);
        });
    });

    // ──────────────── Issuance ────────────────

    describe("Issuance", function () {
        it("should issue a credential and return tokenId 1", async function () {
            const tx = await sbt.issueCredential(holder.address, credentialHash, IPFS_HASH);
            const receipt = await tx.wait();

            // Check token exists and is owned by holder
            expect(await sbt.ownerOf(1)).to.equal(holder.address);
            expect(await sbt.totalCredentials()).to.equal(1);
        });

        it("should emit CredentialIssued event", async function () {
            await expect(sbt.issueCredential(holder.address, credentialHash, IPFS_HASH))
                .to.emit(sbt, "CredentialIssued")
                .withArgs(1, holder.address, credentialHash, IPFS_HASH, (val) => val > 0);
        });

        it("should store credential data correctly", async function () {
            await sbt.issueCredential(holder.address, credentialHash, IPFS_HASH);
            const [h, ch, ipfs, ts, revoked, reissued] = await sbt.verifyCredential(1);

            expect(h).to.equal(holder.address);
            expect(ch).to.equal(credentialHash);
            expect(ipfs).to.equal(IPFS_HASH);
            expect(ts).to.be.gt(0);
            expect(revoked).to.equal(false);
            expect(reissued).to.equal(0);
        });

        it("should reject issuance from non-owner", async function () {
            await expect(
                sbt.connect(other).issueCredential(holder.address, credentialHash, IPFS_HASH)
            ).to.be.revertedWithCustomError(sbt, "OwnableUnauthorizedAccount");
        });

        it("should reject zero address holder", async function () {
            await expect(
                sbt.issueCredential(ethers.ZeroAddress, credentialHash, IPFS_HASH)
            ).to.be.revertedWith("SoulboundToken: zero address holder");
        });

        it("should reject empty credential hash", async function () {
            await expect(
                sbt.issueCredential(holder.address, ethers.ZeroHash, IPFS_HASH)
            ).to.be.revertedWith("SoulboundToken: empty credential hash");
        });

        it("should reject empty IPFS hash", async function () {
            await expect(
                sbt.issueCredential(holder.address, credentialHash, "")
            ).to.be.revertedWith("SoulboundToken: empty IPFS hash");
        });
    });

    // ──────────────── Soulbound (Transfer Blocking) ────────────────

    describe("Soulbound Enforcement", function () {
        beforeEach(async function () {
            await sbt.issueCredential(holder.address, credentialHash, IPFS_HASH);
        });

        it("should block transferFrom", async function () {
            await expect(
                sbt.connect(holder).transferFrom(holder.address, other.address, 1)
            ).to.be.revertedWith("SoulboundToken: transfers are disabled");
        });

        it("should block safeTransferFrom", async function () {
            await expect(
                sbt.connect(holder)["safeTransferFrom(address,address,uint256)"](
                    holder.address,
                    other.address,
                    1
                )
            ).to.be.revertedWith("SoulboundToken: transfers are disabled");
        });
    });

    // ──────────────── Revocation ────────────────

    describe("Revocation", function () {
        beforeEach(async function () {
            await sbt.issueCredential(holder.address, credentialHash, IPFS_HASH);
        });

        it("should revoke a credential", async function () {
            await sbt.revokeCredential(1);
            const [, , , , revoked] = await sbt.verifyCredential(1);
            expect(revoked).to.equal(true);
        });

        it("should emit CredentialRevoked event", async function () {
            await expect(sbt.revokeCredential(1))
                .to.emit(sbt, "CredentialRevoked")
                .withArgs(1, (val) => val > 0);
        });

        it("should reject revocation from non-owner", async function () {
            await expect(
                sbt.connect(other).revokeCredential(1)
            ).to.be.revertedWithCustomError(sbt, "OwnableUnauthorizedAccount");
        });

        it("should reject double revocation", async function () {
            await sbt.revokeCredential(1);
            await expect(sbt.revokeCredential(1)).to.be.revertedWith(
                "SoulboundToken: already revoked"
            );
        });
    });

    // ──────────────── Re-issuance ────────────────

    describe("Re-issuance", function () {
        beforeEach(async function () {
            await sbt.issueCredential(holder.address, credentialHash, IPFS_HASH);
            await sbt.revokeCredential(1);
        });

        it("should re-issue with a new token ID", async function () {
            const newHash = ethers.keccak256(ethers.toUtf8Bytes("updated-credential"));
            await sbt.reissueCredential(1, holder.address, newHash, "QmNewHash");

            // New token should be ID 2
            expect(await sbt.ownerOf(2)).to.equal(holder.address);
            expect(await sbt.totalCredentials()).to.equal(2);
        });

        it("should link new token to old revoked token", async function () {
            const newHash = ethers.keccak256(ethers.toUtf8Bytes("updated-credential"));
            await sbt.reissueCredential(1, holder.address, newHash, "QmNewHash");

            const [, , , , , reissuedFrom] = await sbt.verifyCredential(2);
            expect(reissuedFrom).to.equal(1);
        });

        it("should emit CredentialReissued event", async function () {
            const newHash = ethers.keccak256(ethers.toUtf8Bytes("updated-credential"));
            await expect(sbt.reissueCredential(1, holder.address, newHash, "QmNewHash"))
                .to.emit(sbt, "CredentialReissued")
                .withArgs(2, 1, holder.address, (val) => val > 0);
        });

        it("should reject re-issuance of non-revoked token", async function () {
            // Issue a second token (not revoked)
            await sbt.issueCredential(other.address, credentialHash, IPFS_HASH);
            const newHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            await expect(
                sbt.reissueCredential(2, other.address, newHash, "QmTest")
            ).to.be.revertedWith("SoulboundToken: old token not revoked");
        });
    });

    // ──────────────── View Functions ────────────────

    describe("View Functions", function () {
        it("should return credentials by holder", async function () {
            await sbt.issueCredential(holder.address, credentialHash, IPFS_HASH);
            const hash2 = ethers.keccak256(ethers.toUtf8Bytes("cred2"));
            await sbt.issueCredential(holder.address, hash2, "QmHash2");

            const tokens = await sbt.getCredentialsByHolder(holder.address);
            expect(tokens.length).to.equal(2);
            expect(tokens[0]).to.equal(1);
            expect(tokens[1]).to.equal(2);
        });

        it("should revert verify for non-existent token", async function () {
            await expect(sbt.verifyCredential(999)).to.be.revertedWith(
                "SoulboundToken: token does not exist"
            );
        });
    });
});
