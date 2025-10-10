const express = require('express');
const CryptoJS = require('crypto-js');
const prisma = require('../config/database');
const { authenticate, verifyAdminToken } = require('../middleware/auth');
const { sanitizeInput, sanitizeEmail, sanitizePhone, validatePassword, DEBUG_NO_VALIDATION, DEFAULT_PASSWORD } = require('../middleware/validation');

const router = express.Router();

// Get all users
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        codeitbryan: true,
        GSM: true,
        admin: true,
        actif: true,
        mdpTemporaire: true,
        titre: true,
        fonction: true,
        nom: true,
        prenom: true,
        niveau: true,
        revenuQ1: true,
        revenuQ2: true,
        entreeFonction: true
      }
    });
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Non-admin user list (limited / non-confidential fields)
router.get("/public", authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        codeitbryan: true,
        GSM: true,
        admin: true, // allow seeing who is admin (can be removed if undesired)
        titre: true,
        fonction: true,
        nom: true,
        prenom: true,
        niveau: true,
        entreeFonction: true
      }
    });
    res.json(users);
  } catch (err) {
    console.error("Get users (public) error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create new user (debug mode can bypass most validation and force default password)
router.post("/", verifyAdminToken, async (req, res) => {
  let {
    email,
    codeitbryan,
    GSM,
    mdp,
    sel,
    titre,
    fonction,
    nom,
    prenom,
    admin = false,
    niveau = 0
  } = req.body;

  if (!DEBUG_NO_VALIDATION) {
    nom = sanitizeInput(nom);
    prenom = sanitizeInput(prenom);
    email = sanitizeEmail(email);
    codeitbryan = sanitizeEmail(codeitbryan);
    GSM = sanitizePhone(GSM);
    titre = sanitizeInput(titre);
    fonction = sanitizeInput(fonction);
  }

  // When in debug mode, provide fallbacks
  if (DEBUG_NO_VALIDATION) {
    if (!email) email = `debug_user_${Date.now()}@example.test`;
    if (!nom) nom = 'Debug';
    if (!prenom) prenom = 'User';
  }

  // Validation (skipped if debug)
  if (!DEBUG_NO_VALIDATION) {
    if (!email || !nom || !prenom || !mdp || !sel) {
      return res.status(400).json({ error: "Email, name, surname, password and salt are required" });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    const nameRegex = /^[a-zA-Z ]+$/;
    if (!nameRegex.test(nom) || !nameRegex.test(prenom)) {
      return res.status(400).json({ error: "Names can only contain letters and spaces" });
    }
  }

  try {
    // Force default password & salt when in debug mode (ignore provided mdp/sel)
    if (DEBUG_NO_VALIDATION) {
      const salt = CryptoJS.lib.WordArray.random(16).toString();
      sel = salt;
      // Frontend supplies hashed password normally; here we mimic same hashing logic: SHA256(DEFAULT_PASSWORD + salt)
      mdp = CryptoJS.SHA256(DEFAULT_PASSWORD + salt).toString();
    }

    // Users created with a temporary password cannot be admins yet
    if (admin) {
      admin = false;
    }
    const newUser = await prisma.user.create({
      data: {
        email,
        codeitbryan,
        GSM,
        mdp,
        sel,
        titre,
        fonction,
        nom,
        prenom,
        admin,
        niveau,
        mdpTemporaire: true,
        entreeFonction: new Date()
      }
    });

    const { mdp: _, sel: __, ...userResponse } = newUser;
    res.json({
      message: "User created successfully",
      user: userResponse,
      defaultPassword: DEBUG_NO_VALIDATION ? DEFAULT_PASSWORD : undefined
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Reset user password (forces default in debug mode if no password provided)
router.post("/:id/resetPassword", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let { newPassword, salt } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (DEBUG_NO_VALIDATION) {
      const genSalt = CryptoJS.lib.WordArray.random(16).toString();
      salt = genSalt;
      newPassword = CryptoJS.SHA256(DEFAULT_PASSWORD + genSalt).toString();
    } else {
      if (!newPassword || !salt) {
        // Auto-generate default password workflow when omitted
        const genSalt = CryptoJS.lib.WordArray.random(16).toString();
        salt = genSalt;
        newPassword = CryptoJS.SHA256(DEFAULT_PASSWORD + genSalt).toString();
      }
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        mdp: newPassword,
        sel: salt,
        mdpTemporaire: true,
        admin: false // strip admin on reset
      }
    });

    res.json({
      message: "Password reset successfully. User must change password on next login.",
      defaultPassword: DEBUG_NO_VALIDATION ? DEFAULT_PASSWORD : undefined
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Update user
router.put("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let updateData = { ...req.body };

  // Remove sensitive fields that shouldn't be updated this way
  delete updateData.mdp;
  delete updateData.sel;
  delete updateData.id;

  // Sanitize inputs
  if (updateData.nom) updateData.nom = sanitizeInput(updateData.nom);
  if (updateData.prenom) updateData.prenom = sanitizeInput(updateData.prenom);
  if (updateData.email) updateData.email = sanitizeEmail(updateData.email);
  if (updateData.codeitbryan) updateData.codeitbryan = sanitizeEmail(updateData.codeitbryan);
  if (updateData.GSM) updateData.GSM = sanitizePhone(updateData.GSM);
  if (updateData.titre) updateData.titre = sanitizeInput(updateData.titre);
  if (updateData.fonction) updateData.fonction = sanitizeInput(updateData.fonction);

  // Enforce rule: a user with a temporary password cannot be admin
  if (updateData.mdpTemporaire === true) {
    updateData.admin = false;
  }

  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        codeitbryan: true,
        GSM: true,
        admin: true,
        actif: true,
        mdpTemporaire: true,
        titre: true,
        fonction: true,
        nom: true,
        prenom: true,
        niveau: true,
        revenuQ1: true,
        revenuQ2: true,
        entreeFonction: true
      }
    });
    res.json({
      message: "User updated successfully",
      user
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(400).json({ error: "Failed to update user" });
  }
});

// Deactivate user - Soft delete
router.put("/:id/deactivate", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { actif: false }
    });
    res.json({ message: "User deactivated successfully" });
  } catch (err) {
    console.error("Deactivate user error:", err);
    res.status(400).json({ error: "Failed to deactivate user" });
  }
});

// Activate user
router.put("/:id/activate", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { actif: true }
    });
    res.json({ message: "User activated successfully" });
  } catch (err) {
    console.error("Activate user error:", err);
    res.status(400).json({ error: "Failed to activate user" });
  }
});

// Delete user (hard delete)
router.delete("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(400).json({ error: "Failed to delete user" });
  }
});

module.exports = router;