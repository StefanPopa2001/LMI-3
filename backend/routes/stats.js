const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Get admin statistics
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    // Get level statistics using Prisma queries
    const classesWithSeances = await prisma.classe.findMany({
      select: {
        level: true,
        seances: {
          select: {
            presences: {
              select: {
                statut: true
              }
            }
          }
        }
      }
    });

    const levelStatsMap = new Map();
    classesWithSeances.forEach(classe => {
      const level = classe.level || 'Non défini';
      if (!levelStatsMap.has(level)) {
        levelStatsMap.set(level, { totalPresences: 0, presentCount: 0 });
      }
      const stats = levelStatsMap.get(level);

      classe.seances.forEach(seance => {
        seance.presences.forEach(presence => {
          stats.totalPresences++;
          if (presence.statut === 'present') {
            stats.presentCount++;
          }
        });
      });
    });

    const levelStats = Array.from(levelStatsMap.entries())
      .map(([level, stats]) => ({
        level,
        totalPresences: stats.totalPresences,
        presentCount: stats.presentCount,
        presentPercentage: stats.totalPresences > 0
          ? Math.round((stats.presentCount / stats.totalPresences) * 100)
          : 0
      }))
      .sort((a, b) => a.level.localeCompare(b.level));

    // Get teacher statistics
    const teachersWithClasses = await prisma.user.findMany({
      where: {
        OR: [
          { admin: false },
          { admin: null }
        ]
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        classesEnseignees: {
          select: {
            seances: {
              select: {
                presences: {
                  select: {
                    statut: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const teacherStats = teachersWithClasses
      .map(teacher => {
        let totalPresences = 0;
        let presentCount = 0;

        teacher.classesEnseignees.forEach(classe => {
          classe.seances.forEach(seance => {
            seance.presences.forEach(presence => {
              totalPresences++;
              if (presence.statut === 'present') {
                presentCount++;
              }
            });
          });
        });

        return {
          teacherId: teacher.id,
          teacherName: `${teacher.prenom} ${teacher.nom}`,
          totalPresences,
          presentCount,
          presentPercentage: totalPresences > 0
            ? Math.round((presentCount / totalPresences) * 100)
            : 0
        };
      })
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName));

    res.json({
      levelStats,
      teacherStats
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

module.exports = router;