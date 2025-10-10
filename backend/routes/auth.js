const express = require('express');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const prisma = require('../config/database');
const { authenticate, SECRET_KEY } = require('../middleware/auth');
const { sanitizeEmail, validatePassword, authLimiter, DEBUG_NO_VALIDATION, DEFAULT_PASSWORD } = require('../middleware/validation');

const router = express.Router();

// Get user salt for secure login
router.post("/getSalt", authLimiter, async (req, res) => {
  const { email } = req.body;

  // Normalize and sanitize the email
  const normalizedEmail = sanitizeEmail(email);

  try {
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { sel: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ salt: user.sel });
  } catch (err) {
    console.error("Get salt error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login user
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Normalize and sanitize the email
  const normalizedEmail = sanitizeEmail(email);

  try {
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    if (user.mdp !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, admin: user.admin },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    // Check if password is temporary
    const response = {
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        admin: user.admin,
        mdpTemporaire: user.mdpTemporaire
      }
    };

    if (user.mdpTemporaire) {
      response.requirePasswordChange = true;
      response.message = "You must change your password before continuing";
    }

    res.json(response);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Change password (for first-time login or user-initiated change)
router.post("/changePassword", authenticate, async (req, res) => {
  const { currentPassword, newPassword, salt } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If not temporary password, verify current password
    if (!user.mdpTemporaire && user.mdp !== currentPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Validate new password (skip validation for first-time login)
    if (!user.mdpTemporaire) {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
    }

    // Update password and remove temporary flag
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        mdp: newPassword,
        sel: salt,
        mdpTemporaire: false
      }
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;