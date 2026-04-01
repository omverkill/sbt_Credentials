// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulboundToken
 * @notice Non-transferable ERC-721 token for academic credential management.
 * @dev Transfers are blocked at the contract level. Only the contract owner
 *      (the issuing institution) can mint, revoke, and re-issue tokens.
 *
 * Privacy: No PII is stored on-chain. Only credential hashes, IPFS content
 * hashes, and metadata are recorded. The full credential document lives
 * off-chain (IPFS) and can be unpinned for GDPR compliance.
 */
contract SoulboundToken is ERC721, Ownable {
    // ──────────────── Types ────────────────

    struct Credential {
        bytes32 credentialHash;   // keccak256 of full credential JSON
        string  ipfsHash;         // IPFS CID pointing to off-chain document
        uint256 issueTimestamp;   // block.timestamp at issuance
        bool    isRevoked;        // true if credential has been revoked
        uint256 reissuedFrom;     // tokenId of the revoked token (0 if original)
    }

    // ──────────────── State ────────────────

    uint256 private _nextTokenId;

    /// tokenId → Credential
    mapping(uint256 => Credential) private _credentials;

    /// holder address → array of tokenIds
    mapping(address => uint256[]) private _holderTokens;

    /// total credentials ever issued (including revoked)
    uint256 public totalCredentials;

    // ──────────────── Events ────────────────

    event CredentialIssued(
        uint256 indexed tokenId,
        address indexed holder,
        bytes32 credentialHash,
        string  ipfsHash,
        uint256 timestamp
    );

    event CredentialRevoked(uint256 indexed tokenId, uint256 timestamp);

    event CredentialReissued(
        uint256 indexed newTokenId,
        uint256 indexed oldTokenId,
        address indexed holder,
        uint256 timestamp
    );

    // ──────────────── Constructor ────────────────

    constructor()
        ERC721("AcademicSoulboundToken", "ASBT")
        Ownable(msg.sender)
    {
        _nextTokenId = 1; // start IDs at 1
    }

    // ──────────────── Soulbound enforcement ────────────────

    /**
     * @dev Override to block all transfers except minting (from == address(0))
     *      and burning (to == address(0)).
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == 0) and burning (to == 0); block transfers.
        if (from != address(0) && to != address(0)) {
            revert("SoulboundToken: transfers are disabled");
        }

        return super._update(to, tokenId, auth);
    }

    // ──────────────── Issuance ────────────────

    /**
     * @notice Issue a new credential to `holder`.
     * @param holder        Wallet address the SBT is bound to.
     * @param credentialHash keccak256 of the full credential JSON.
     * @param ipfsHash      IPFS CID of the off-chain credential document.
     */
    function issueCredential(
        address holder,
        bytes32 credentialHash,
        string calldata ipfsHash
    ) external onlyOwner returns (uint256) {
        require(holder != address(0), "SoulboundToken: zero address holder");
        require(credentialHash != bytes32(0), "SoulboundToken: empty credential hash");
        require(bytes(ipfsHash).length > 0, "SoulboundToken: empty IPFS hash");

        uint256 tokenId = _nextTokenId++;
        _safeMint(holder, tokenId);

        _credentials[tokenId] = Credential({
            credentialHash: credentialHash,
            ipfsHash: ipfsHash,
            issueTimestamp: block.timestamp,
            isRevoked: false,
            reissuedFrom: 0
        });

        _holderTokens[holder].push(tokenId);
        totalCredentials++;

        emit CredentialIssued(tokenId, holder, credentialHash, ipfsHash, block.timestamp);
        return tokenId;
    }

    // ──────────────── Revocation ────────────────

    /**
     * @notice Revoke a credential. The token remains on-chain as an
     *         auditable record but is marked invalid.
     */
    function revokeCredential(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "SoulboundToken: token does not exist");
        require(!_credentials[tokenId].isRevoked, "SoulboundToken: already revoked");

        _credentials[tokenId].isRevoked = true;

        emit CredentialRevoked(tokenId, block.timestamp);
    }

    // ──────────────── Re-issuance ────────────────

    /**
     * @notice Re-issue a credential that was previously revoked.
     *         Mints a NEW token to the same holder; the old revoked token
     *         stays on-chain for audit trail. The new token's `reissuedFrom`
     *         field points back to the old one.
     */
    function reissueCredential(
        uint256 oldTokenId,
        address holder,
        bytes32 credentialHash,
        string calldata ipfsHash
    ) external onlyOwner returns (uint256) {
        require(_credentials[oldTokenId].issueTimestamp != 0,
            "SoulboundToken: old token does not exist");
        require(_credentials[oldTokenId].isRevoked, "SoulboundToken: old token not revoked");
        require(holder != address(0), "SoulboundToken: zero address holder");

        uint256 newTokenId = _nextTokenId++;
        _safeMint(holder, newTokenId);

        _credentials[newTokenId] = Credential({
            credentialHash: credentialHash,
            ipfsHash: ipfsHash,
            issueTimestamp: block.timestamp,
            isRevoked: false,
            reissuedFrom: oldTokenId
        });

        _holderTokens[holder].push(newTokenId);
        totalCredentials++;

        emit CredentialReissued(newTokenId, oldTokenId, holder, block.timestamp);
        return newTokenId;
    }

    // ──────────────── View functions ────────────────

    /**
     * @notice Verify a credential's state and data.
     * @return holder          Address the SBT is bound to
     * @return credentialHash  Hash of the full credential document
     * @return ipfsHash        IPFS CID of the off-chain document
     * @return issueTimestamp  When the credential was issued
     * @return isRevoked       Whether the credential has been revoked
     * @return reissuedFrom    Token ID this was re-issued from (0 if original)
     */
    function verifyCredential(uint256 tokenId)
        external
        view
        returns (
            address holder,
            bytes32 credentialHash,
            string memory ipfsHash,
            uint256 issueTimestamp,
            bool isRevoked,
            uint256 reissuedFrom
        )
    {
        require(_credentials[tokenId].issueTimestamp != 0, "SoulboundToken: token does not exist");

        Credential memory cred = _credentials[tokenId];
        holder = ownerOf(tokenId);

        return (
            holder,
            cred.credentialHash,
            cred.ipfsHash,
            cred.issueTimestamp,
            cred.isRevoked,
            cred.reissuedFrom
        );
    }

    /**
     * @notice Get all token IDs held by a specific address.
     */
    function getCredentialsByHolder(address holder)
        external
        view
        returns (uint256[] memory)
    {
        return _holderTokens[holder];
    }
}
