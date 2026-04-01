# Academic Credential System (Soulbound Tokens)

A decentralized, three-tier application for issuing, managing, and verifying academic credentials using Soulbound Tokens (SBTs) on an Ethereum network. This platform ensures credentials are secure, tamper-proof, and non-transferable, preserving the absolute integrity of academic degrees.

## 🌟 Features

- **Non-Transferable SBTs**: Custom ERC721 tokens that permanently bind academic credentials to a student's wallet address.
- **Privacy-Preserving (GDPR Compliant)**: Only digital hashes and IPFS CIDs act as on-chain proofs. Personal Identifiable Information (PII) is stored securely off-chain via IPFS.
- **Full Credential Lifecycle Management**:
  - Issue new credentials directly to addresses.
  - Revoke compromised or outdated credentials with a permanent audit trail.
  - Re-issue degrees with a linked history pointing to older tokens.
- **Secure Admin Dashboard**: A Node.js backend handles administrative authentication and Pinning to IPFS via Pinata.
- **Public Verification Portal**: A beautiful, responsive React/Vite frontend where employers can publicly verify any token or wallet address.

## 🛠️ Tech Stack

- **Smart Contracts**: Solidity, Hardhat, Ethers.js, OpenZeppelin
- **Backend API**: Node.js, Express, JWT, IPFS (Pinata proxy)
- **Frontend App**: React, Vite, Vanilla CSS

## 📂 Project Structure

```text
├── contracts/    # Hardhat workspace containing Solidity SBT source & tests
├── backend/      # Node.js/Express API handling IPFS, Admin Auth, and Ethers provider
└── frontend/     # React application for issuing and verifying credentials
```

## 🚀 Getting Started

Follow these steps to deploy and run the system locally.

### 1. Prerequisites
- [Node.js](https://nodejs.org/en/download/) (v16+)
- Git

### 2. Smart Contract Setup (Hardhat)

1. Navigate to the contracts directory and install dependencies:
   ```bash
   cd contracts
   npm install
   ```
2. Start the local Hardhat blockchain node in one terminal window:
   ```bash
   npx hardhat node
   ```
3. Open a second terminal, and deploy the contract to your local chain:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network localhost
   ```
   *(Note down the deployed contract address — you will need this for the backend)*

### 3. Backend API Setup

1. Open a new terminal and navigate to the backend:
   ```bash
   cd backend
   npm install
   ```
2. Configure your Environment Variables. Rename `.env.example` to `.env` or create a new `.env` file:
   ```env
   # Example backend/.env
   PORT=3000
   RPC_URL=http://127.0.0.1:8545
   DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE>
   JWT_SECRET=super_secret_jwt_key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=password
   ```
   *(Add your Pinata API keys if you want true IPFS propagation, otherwise the backend gracefully uses a local IPFS system for mock development).*
3. Run the development server:
   ```bash
   npm run dev
   # Server will start on http://localhost:3000
   ```

### 4. Frontend Setup

1. Open a third terminal and navigate to the frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   # App will start on http://localhost:5173
   ```

## 📖 How to Use

1. **Log in as Admin**: Using the frontend GUI, click "Admin Issue" (or navigate there) and log in using the admin credentials specified in your backend `.env` (like `admin` / `password`).
2. **Issue SBT**: Provide a valid Ethereum wallet address (e.g., snag one from your Hardhat Node terminal output), the Student Name, Degree, Institution, and Graduation Date.
3. **Verify**: Navigate back to the Verify page. Input a Token ID or the student's Wallet Address to see the real-time, on-chain valid credential perfectly synchronized with the off-chain IPFS payload!
