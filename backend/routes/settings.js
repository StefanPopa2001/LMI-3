const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken, authenticate } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');

const router = express.Router();

// Get all settings grouped by category
router.get("/", authenticate, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { active: true },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { label: 'asc' }
      ]
    });

    // Group by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});

    res.json(groupedSettings);
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Get settings for a specific category
router.get("/:category", authenticate, async (req, res) => {
  const { category } = req.params;

  try {
    const settings = await prisma.setting.findMany({
      where: {
        category: category,
        active: true
      },
      orderBy: [
        { order: 'asc' },
        { label: 'asc' }
      ]
    });

    res.json(settings);
  } catch (err) {
    console.error("Get category settings error:", err);
    res.status(500).json({ error: "Failed to fetch category settings" });
  }
});

// Create new setting
router.post("/", verifyAdminToken, async (req, res) => {
  let { category, value, label, description, order } = req.body;

  // Validate required fields
  if (!category || category.trim() === '') {
    return res.status(400).json({ error: "Category is required" });
  }
  if (!value || value.trim() === '') {
    return res.status(400).json({ error: "Value is required" });
  }

  // Validate category
  const allowedCategories = ['level', 'typeCours', 'location', 'salle'];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid category. Allowed categories: " + allowedCategories.join(', ') });
  }

  // Sanitize inputs
  category = sanitizeInput(category);
  value = sanitizeInput(value);
  label = label ? sanitizeInput(label) : value;
  description = description ? sanitizeInput(description) : null;

  try {
    const setting = await prisma.setting.create({
      data: {
        category,
        value,
        label,
        description,
        order: order || 0
      }
    });

    res.json({
      message: "Setting created successfully",
      setting
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "A setting with this category and value already exists" });
    }
    console.error("Create setting error:", err);
    res.status(500).json({ error: "Failed to create setting" });
  }
});

// Update setting
router.put("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let { value, label, description, order, active } = req.body;

  // Sanitize inputs
  if (value) value = sanitizeInput(value);
  if (label) label = sanitizeInput(label);
  if (description) description = sanitizeInput(description);

  try {
    const setting = await prisma.setting.update({
      where: { id: parseInt(id) },
      data: {
        ...(value && { value }),
        ...(label && { label }),
        ...(description !== undefined && { description }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active })
      }
    });

    res.json({
      message: "Setting updated successfully",
      setting
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "A setting with this category and value already exists" });
    }
    console.error("Update setting error:", err);
    res.status(400).json({ error: "Failed to update setting" });
  }
});

// Delete setting
router.delete("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.setting.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Setting deleted successfully" });
  } catch (err) {
    console.error("Delete setting error:", err);
    res.status(500).json({ error: "Failed to delete setting" });
  }
});

// Bulk create default settings
router.post("/initialize", verifyAdminToken, async (req, res) => {
  try {
    const defaultSettings = [
      // Levels
      { category: 'level', value: 'beginner', label: 'Débutant', order: 1 },
      { category: 'level', value: 'intermediate', label: 'Intermédiaire', order: 2 },
      { category: 'level', value: 'advanced', label: 'Avancé', order: 3 },

      // Types de cours
      { category: 'typeCours', value: 'coding', label: 'Programmation', order: 1 },
      { category: 'typeCours', value: 'robotics', label: 'Robotique', order: 2 },
      { category: 'typeCours', value: 'design', label: 'Design numérique', order: 3 },
      { category: 'typeCours', value: 'game-dev', label: 'Développement de jeux', order: 4 },

      // Locations
      { category: 'location', value: 'main-building', label: 'Bâtiment principal', order: 1 },
      { category: 'location', value: 'annex', label: 'Annexe', order: 2 },
      { category: 'location', value: 'online', label: 'En ligne', order: 3 },

      // Salles
      { category: 'salle', value: 'salle-1', label: 'Salle 1', order: 1 },
      { category: 'salle', value: 'salle-2', label: 'Salle 2', order: 2 },
      { category: 'salle', value: 'salle-3', label: 'Salle 3', order: 3 },
      { category: 'salle', value: 'lab-robotique', label: 'Laboratoire Robotique', order: 4 }
    ];

    const createdSettings = [];
    for (const settingData of defaultSettings) {
      try {
        const setting = await prisma.setting.create({
          data: settingData
        });
        createdSettings.push(setting);
      } catch (err) {
        // Skip if already exists
        if (err.code !== 'P2002') {
          console.error("Error creating setting:", settingData, err);
        }
      }
    }

    res.json({
      message: `Initialized ${createdSettings.length} default settings`,
      settings: createdSettings
    });
  } catch (err) {
    console.error("Initialize settings error:", err);
    res.status(500).json({ error: "Failed to initialize settings" });
  }
});

module.exports = router;