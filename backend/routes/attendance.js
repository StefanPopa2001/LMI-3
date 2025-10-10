const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Get seances for a specific week
router.get("/week/:startDate", verifyAdminToken, async (req, res) => {
  const { startDate } = req.params;

  try {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: "Invalid start date format" });
    }

    // Calculate end of week (Sunday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const seances = await prisma.seance.findMany({
      where: {
        dateHeure: {
          gte: start,
          lte: end
        }
      },
      include: {
        classe: {
          include: {
            teacher: {
              select: { id: true, nom: true, prenom: true }
            },
            eleves: {
              include: {
                eleve: {
                  select: { id: true, nom: true, prenom: true }
                }
              }
            }
          }
        },
        presences: {
          include: {
            eleve: {
              select: { id: true, nom: true, prenom: true }
            }
          }
        },
        presentTeacher: {
          select: { id: true, nom: true, prenom: true }
        }
      },
      orderBy: {
        dateHeure: 'asc'
      }
    });

    res.json(seances);
  } catch (err) {
    console.error("Get attendance week error:", err);
    res.status(500).json({ error: "Failed to get seances for week" });
  }
});

// Get attendance for a specific seance
router.get("/seances/:id/attendance", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const seance = await prisma.seance.findUnique({
      where: { id: parseInt(id) },
      include: {
        classe: {
          include: {
            eleves: {
              include: {
                eleve: {
                  select: { id: true, nom: true, prenom: true }
                }
              }
            }
          }
        },
        presences: {
          include: {
            eleve: {
              select: { id: true, nom: true, prenom: true }
            }
          }
        }
      }
    });

    if (!seance) {
      return res.status(404).json({ error: "Séance non trouvée" });
    }

    res.json(seance);
  } catch (err) {
    console.error("Get seance attendance error:", err);
    res.status(500).json({ error: "Failed to get seance attendance" });
  }
});

// Update attendance for a student
router.put("/:presenceId", verifyAdminToken, async (req, res) => {
  const { presenceId } = req.params;
  const { statut, notes } = req.body;

  if (!statut || !['present', 'absent', 'no_status', 'awaiting'].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide. Doit être: present, absent, no_status, awaiting" });
  }

  try {
    const updatedPresence = await prisma.presence.update({
      where: { id: parseInt(presenceId) },
      data: {
        statut,
        notes: notes || null
      },
      include: {
        eleve: {
          select: { id: true, nom: true, prenom: true }
        },
        seance: {
          select: { id: true, dateHeure: true }
        }
      }
    });

    res.json(updatedPresence);
  } catch (err) {
    console.error("Update attendance error:", err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: "Présence non trouvée" });
    } else {
      res.status(500).json({ error: "Failed to update attendance" });
    }
  }
});

// Bulk update attendance for a seance
router.put("/seances/:id/attendance", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { attendances } = req.body; // Array of { eleveId, statut, notes? }

  if (!Array.isArray(attendances)) {
    return res.status(400).json({ error: "Attendances doit être un tableau" });
  }

  try {
    const seance = await prisma.seance.findUnique({
      where: { id: parseInt(id) },
      include: {
        classe: {
          include: {
            eleves: true
          }
        }
      }
    });

    if (!seance) {
      return res.status(404).json({ error: "Séance non trouvée" });
    }

    const results = [];
    for (const attendance of attendances) {
      const { eleveId, statut, notes } = attendance;

      if (!statut || !['present', 'absent', 'no_status', 'awaiting'].includes(statut)) {
        return res.status(400).json({ error: `Statut invalide pour élève ${eleveId}. Doit être: present, absent, no_status, awaiting` });
      }

      // Check if presence already exists
      let presence = await prisma.presence.findUnique({
        where: {
          seanceId_eleveId: {
            seanceId: parseInt(id),
            eleveId: parseInt(eleveId)
          }
        }
      });

      if (presence) {
        // Update existing
        presence = await prisma.presence.update({
          where: { id: presence.id },
          data: { statut, notes: notes || null },
          include: {
            eleve: { select: { id: true, nom: true, prenom: true } }
          }
        });
      } else {
        // Create new
        presence = await prisma.presence.create({
          data: {
            seanceId: parseInt(id),
            eleveId: parseInt(eleveId),
            statut,
            notes: notes || null
          },
          include: {
            eleve: { select: { id: true, nom: true, prenom: true } }
          }
        });
      }

      results.push(presence);
    }

    res.json({
      message: `${results.length} présences mises à jour`,
      attendances: results
    });
  } catch (err) {
    console.error("Bulk update attendance error:", err);
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

// Get calendar view for a year (seances grouped by weeks)
router.get("/calendar/:year", verifyAdminToken, async (req, res) => {
  const { year } = req.params;
  const yearNum = parseInt(year);

  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return res.status(400).json({ error: "Invalid year" });
  }

  try {
    const startOfYear = new Date(yearNum, 0, 1); // January 1st
    const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59, 999); // December 31st

    const seances = await prisma.seance.findMany({
      where: {
        dateHeure: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      include: {
        classe: {
          select: {
            id: true,
            nom: true,
            level: true,
            typeCours: true,
            location: true,
            salle: true,
            teacher: {
              select: { id: true, nom: true, prenom: true }
            }
          }
        },
        presentTeacher: {
          select: { id: true, nom: true, prenom: true }
        }
      },
      orderBy: {
        dateHeure: 'asc'
      }
    });

    // Group seances by week
    const weeks = {};
    seances.forEach(seance => {
      const date = new Date(seance.dateHeure);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekStart: weekKey,
          seances: []
        };
      }
      weeks[weekKey].seances.push(seance);
    });

    // Convert to array and sort by week
    const calendarData = Object.values(weeks).sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    res.json({
      year: yearNum,
      weeks: calendarData
    });
  } catch (err) {
    console.error("Get attendance calendar error:", err);
    res.status(500).json({ error: "Failed to get calendar data" });
  }
});

// Toggle a seance's active status in calendar (frontend expects toggle)
router.put('/calendar/toggle', verifyAdminToken, async (req, res) => {
  const { seanceId, actif } = req.body;
  if (!seanceId) return res.status(400).json({ error: 'seanceId required' });
  try {
    const updated = await prisma.seance.update({
      where: { id: parseInt(seanceId) },
      data: { actif: actif === undefined ? true : !!actif }
    });
    res.json({ message: 'Seance toggled', seance: updated });
  } catch (err) {
    console.error('Toggle seance error', err);
    res.status(500).json({ error: 'Failed to toggle seance' });
  }
});

// Reset calendar for a year (deactivate all seances of that year)
router.post('/calendar/reset/:year', verifyAdminToken, async (req, res) => {
  const yearNum = parseInt(req.params.year);
  if (isNaN(yearNum)) return res.status(400).json({ error: 'Invalid year' });
  try {
    const startOfYear = new Date(yearNum, 0, 1);
    const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59, 999);
    const result = await prisma.seance.updateMany({
      where: { dateHeure: { gte: startOfYear, lte: endOfYear } },
      data: { actif: false }
    });
    res.json({ message: 'Calendar reset', updated: result.count });
  } catch (err) {
    console.error('Reset calendar error', err);
    res.status(500).json({ error: 'Failed to reset calendar' });
  }
});

module.exports = router;