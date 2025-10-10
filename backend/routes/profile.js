const express = require('express');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sanitizeInput, sanitizeEmail, sanitizePhone, validatePassword } = require('../middleware/validation');

const router = express.Router();

// Get user profile
router.get("/", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        GSM: true,
        admin: true,
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile (self)
router.put("/", authenticate, async (req, res) => {
  let updateData = { ...req.body };

  // Remove fields that users shouldn't be able to update themselves
  delete updateData.mdp;
  delete updateData.sel;
  delete updateData.id;
  delete updateData.admin;
  delete updateData.mdpTemporaire;
  delete updateData.niveau;
  delete updateData.revenuQ1;
  delete updateData.revenuQ2;
  delete updateData.entreeFonction;

  // Sanitize inputs
  if (updateData.nom) updateData.nom = sanitizeInput(updateData.nom);
  if (updateData.prenom) updateData.prenom = sanitizeInput(updateData.prenom);
  if (updateData.GSM) updateData.GSM = sanitizePhone(updateData.GSM);
  if (updateData.titre) updateData.titre = sanitizeInput(updateData.titre);
  if (updateData.fonction) updateData.fonction = sanitizeInput(updateData.fonction);

  // Email changes might need admin approval in a real system
  if (updateData.email) {
    updateData.email = sanitizeEmail(updateData.email);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(updateData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        GSM: true,
        admin: true,
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
      message: "Profile updated successfully",
      user
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(400).json({ error: "Failed to update profile" });
  }
});

module.exports = router;