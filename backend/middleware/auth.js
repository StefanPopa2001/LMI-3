const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key-change-this-in-production";

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access token is required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  next();
};

// Combined middleware for admin authentication
const verifyAdminToken = [authenticate, requireAdmin];

module.exports = { authenticate, requireAdmin, verifyAdminToken, SECRET_KEY };