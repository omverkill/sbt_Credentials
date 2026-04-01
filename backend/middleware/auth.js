const jwt = require("jsonwebtoken");

/**
 * JWT authentication middleware.
 * Validates the Bearer token from the Authorization header.
 */
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
}

/**
 * API key verification middleware (secondary auth layer).
 * Checks the x-api-key header against the configured key.
 */
function verifyApiKey(req, res, next) {
    const apiKey = req.headers["x-api-key"];

    if (!process.env.API_KEY) {
        // If no API key configured, skip this check
        return next();
    }

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: "Invalid API key" });
    }

    next();
}

/**
 * IP whitelist middleware.
 * If ALLOWED_IPS is set in env, only those IPs are allowed.
 */
function ipWhitelist(req, res, next) {
    const allowedIps = process.env.ALLOWED_IPS;

    if (!allowedIps || allowedIps.trim() === "") {
        return next(); // No whitelist configured, allow all
    }

    const whitelist = allowedIps.split(",").map((ip) => ip.trim());
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!whitelist.includes(clientIp)) {
        return res.status(403).json({ error: "IP not allowed" });
    }

    next();
}

/**
 * Combined admin auth: JWT + API key + IP whitelist.
 */
const adminAuth = [ipWhitelist, verifyApiKey, authenticateJWT];

module.exports = { authenticateJWT, verifyApiKey, ipWhitelist, adminAuth };
