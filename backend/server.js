require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const credentialRoutes = require("./routes/credentials");

const app = express();
const PORT = process.env.PORT || 3001;

// ──────────────── Middleware ────────────────

// CORS — allow frontend origin
app.use(
    cors({
        origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
        credentials: true,
    })
);

// JSON body parsing
app.use(express.json());

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});
app.use(globalLimiter);

// Stricter limiter for admin routes
const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Admin rate limit exceeded. Try again in a minute." },
});
app.use("/api/credentials/issue", adminLimiter);
app.use("/api/credentials/revoke", adminLimiter);
app.use("/api/credentials/reissue", adminLimiter);
app.use("/api/auth/login", adminLimiter);

// ──────────────── Routes ────────────────

app.use("/api", credentialRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        contractAddress: process.env.CONTRACT_ADDRESS || "not configured",
    });
});

// ──────────────── Error handling ────────────────

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// ──────────────── Start ────────────────

app.listen(PORT, () => {
    console.log(`\n🔐 SBT Credential API running on http://localhost:${PORT}`);
    console.log(`   Contract: ${process.env.CONTRACT_ADDRESS || "NOT SET — update .env"}`);
    console.log(`   Blockchain: ${process.env.RPC_URL}`);
    console.log(`   IPFS: ${process.env.PINATA_API_KEY ? "Pinata (live)" : "Mock mode"}\n`);
});

module.exports = app;
