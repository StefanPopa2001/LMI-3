const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// Get weekly permanence schedule
router.get("/week", authenticate, async (req, res) => {
  try {
    const slots = await prisma.permanenceSlot.findMany({
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' }
      ]
    });

    res.json(slots);
  } catch (err) {
    console.error("Get weekly permanence error:", err);
    res.status(500).json({ error: "Failed to get permanence schedule" });
  }
});

// Update permanence slot (admin only)
router.put("/slot", verifyAdminToken, async (req, res) => {
  const { dayOfWeek, period, userId, notes } = req.body;

  if (dayOfWeek === undefined || !['AM', 'PM'].includes(period)) {
    return res.status(400).json({ error: "dayOfWeek and period (AM/PM) are required" });
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" });
  }

  try {
    const slot = await prisma.permanenceSlot.upsert({
      where: {
        dayOfWeek_period: {
          dayOfWeek,
          period
        }
      },
      update: {
        userId: userId || null,
        notes: notes || null
      },
      create: {
        dayOfWeek,
        period,
        userId: userId || null,
        notes: notes || null
      },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      }
    });

    res.json({ slot });
  } catch (err) {
    console.error("Update permanence slot error:", err);
    res.status(500).json({ error: "Failed to update permanence slot" });
  }
});

module.exports = router;