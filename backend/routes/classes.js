const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');

const router = express.Router();

// Get all classes
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const classes = await prisma.classe.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        eleves: {
          include: {
            eleve: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        seances: {
          orderBy: { dateHeure: 'asc' },
          include: {
            presentTeacher: {
              select: { id: true, nom: true, prenom: true, email: true }
            },
            // Include minimal presence data so the frontend can compute counts
            presences: {
              select: { id: true, eleveId: true, statut: true }
            }
          }
        }
      }
    });
    res.json(classes);
  } catch (err) {
    console.error("Get classes error:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Get single class
router.get("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const classe = await prisma.classe.findUnique({
      where: { id: parseInt(id) },
      include: {
        teacher: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        eleves: {
          include: {
            eleve: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        seances: {
          orderBy: { dateHeure: 'asc' },
          include: {
            presentTeacher: {
              select: { id: true, nom: true, prenom: true, email: true }
            },
            // Include minimal presence data for aggregated counts in UI
            presences: {
              select: { id: true, eleveId: true, statut: true }
            }
          }
        }
      }
    });

    if (!classe) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.json(classe);
  } catch (err) {
    console.error("Get class error:", err);
    res.status(500).json({ error: "Failed to fetch class" });
  }
});

// Create new class
router.post("/", verifyAdminToken, async (req, res) => {
  let { nom, description, level, typeCours, location, salle, teacherId, dureeSeance, semainesSeances, jourSemaine, heureDebut, rrPossibles = false, isRecuperation = false, eleveIds = [] } = req.body;

  // Validate required fields
  if (!nom || nom.trim() === '') {
    return res.status(400).json({ error: "Le nom de la classe est requis" });
  }
  if (!teacherId) {
    return res.status(400).json({ error: "Un enseignant doit être assigné" });
  }
  if (!dureeSeance || dureeSeance <= 0) {
    return res.status(400).json({ error: "La durée de séance doit être positive" });
  }
  if (!semainesSeances || !Array.isArray(semainesSeances)) {
    return res.status(400).json({ error: "Les semaines de séances doivent être spécifiées" });
  }
  if (jourSemaine !== undefined && (jourSemaine < 0 || jourSemaine > 6)) {
    return res.status(400).json({ error: "Le jour de la semaine doit être entre 0 (dimanche) et 6 (samedi)" });
  }
  if (heureDebut && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(heureDebut)) {
    return res.status(400).json({ error: "L'heure de début doit être au format HH:MM" });
  }

  // Sanitize inputs
  nom = sanitizeInput(nom);
  description = description ? sanitizeInput(description) : null;
  level = level ? sanitizeInput(level) : null;
  typeCours = typeCours ? sanitizeInput(typeCours) : null;
  location = location ? sanitizeInput(location) : null;
  salle = salle ? sanitizeInput(salle) : null;
  heureDebut = heureDebut ? sanitizeInput(heureDebut) : null;
  isRecuperation = !!isRecuperation;

  try {
    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) }
    });
    if (!teacher) {
      return res.status(400).json({ error: "Enseignant non trouvé" });
    }

    // Create class with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the class
      const newClass = await tx.classe.create({
        data: {
          nom,
          description,
          level,
          typeCours,
          location,
          salle,
          teacherId: parseInt(teacherId),
          dureeSeance: parseInt(dureeSeance),
          semainesSeances: JSON.stringify(semainesSeances),
          jourSemaine: jourSemaine !== undefined ? parseInt(jourSemaine) : null,
          heureDebut: heureDebut || null,
          rrPossibles: !!rrPossibles,
          isRecuperation: isRecuperation
        }
      });

      // Add students to class
      if (eleveIds.length > 0) {
        await tx.classeEleve.createMany({
          data: eleveIds.map(eleveId => ({
            classeId: newClass.id,
            eleveId: parseInt(eleveId)
          }))
        });
      }

      return newClass;
    });

    // Fetch the complete class data
    const classWithDetails = await prisma.classe.findUnique({
      where: { id: result.id },
      include: {
        teacher: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        eleves: {
          include: {
            eleve: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        seances: {
          include: {
            presentTeacher: {
              select: { id: true, nom: true, prenom: true, email: true }
            }
          }
        }
      }
    });

    res.json({
      message: "Classe créée avec succès",
      class: classWithDetails
    });
  } catch (err) {
    console.error("Create class error:", err);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Update class
router.put("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let { nom, description, level, typeCours, location, salle, teacherId, dureeSeance, semainesSeances, jourSemaine, heureDebut, rrPossibles, isRecuperation, eleveIds } = req.body;

  // Sanitize inputs
  if (nom) nom = sanitizeInput(nom);
  if (description) description = sanitizeInput(description);
  if (level) level = sanitizeInput(level);
  if (typeCours) typeCours = sanitizeInput(typeCours);
  if (location) location = sanitizeInput(location);
  if (salle) salle = sanitizeInput(salle);
  if (heureDebut) heureDebut = sanitizeInput(heureDebut);
  if (isRecuperation !== undefined) isRecuperation = !!isRecuperation;

  try {
    const updateData = {};
    if (nom) updateData.nom = nom;
    if (description !== undefined) updateData.description = description;
    if (level !== undefined) updateData.level = level;
    if (typeCours !== undefined) updateData.typeCours = typeCours;
    if (location !== undefined) updateData.location = location;
    if (salle !== undefined) updateData.salle = salle;
    if (teacherId) updateData.teacherId = parseInt(teacherId);
    if (dureeSeance) updateData.dureeSeance = parseInt(dureeSeance);
    if (semainesSeances) updateData.semainesSeances = JSON.stringify(semainesSeances);
    if (jourSemaine !== undefined) updateData.jourSemaine = parseInt(jourSemaine);
    if (heureDebut !== undefined) updateData.heureDebut = heureDebut;
    if (rrPossibles !== undefined) updateData.rrPossibles = !!rrPossibles;
    if (isRecuperation !== undefined) updateData.isRecuperation = !!isRecuperation;

    await prisma.$transaction(async (tx) => {
      // Update class core fields
      const updatedClasse = await tx.classe.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      // Update students if provided
      let finalEleveIds = undefined;
      if (eleveIds !== undefined) {
        // Normalize to integers
        finalEleveIds = (eleveIds || []).map((e) => parseInt(e));
        // Remove existing students
        await tx.classeEleve.deleteMany({
          where: { classeId: parseInt(id) }
        });

        // Add new students
        if (finalEleveIds.length > 0) {
          await tx.classeEleve.createMany({
            data: finalEleveIds.map(eleveId => ({
              classeId: parseInt(id),
              eleveId
            }))
          });
        }
      }

      // Determine future seances for cascading updates
      const now = new Date();
      const futureSeances = await tx.seance.findMany({
        where: {
          classeId: parseInt(id),
          dateHeure: { gte: now }
        },
        select: { id: true, dateHeure: true }
      });

      // 1) Propagate rrPossibles change to future seances
      if (rrPossibles !== undefined && futureSeances.length > 0) {
        await tx.seance.updateMany({
          where: { classeId: parseInt(id), dateHeure: { gte: now } },
          data: { rrPossibles: !!rrPossibles }
        });
      }

      // 2) Propagate duration change to future seances
      if (dureeSeance && futureSeances.length > 0) {
        await tx.seance.updateMany({
          where: { classeId: parseInt(id), dateHeure: { gte: now } },
          data: { duree: parseInt(dureeSeance) }
        });
      }

      // 3) Propagate titular teacher to future seances (presentTeacherId)
      if (teacherId && futureSeances.length > 0) {
        await tx.seance.updateMany({
          where: { classeId: parseInt(id), dateHeure: { gte: now } },
          data: { presentTeacherId: parseInt(teacherId) }
        });
      }

      // 4) Propagate starting time (heureDebut) to future seances
      if (heureDebut && futureSeances.length > 0) {
        const [hoursStr, minutesStr] = heureDebut.split(':');
        const hours = parseInt(hoursStr);
        const minutes = parseInt(minutesStr);
        for (const s of futureSeances) {
          const newDate = new Date(s.dateHeure);
          newDate.setHours(hours, minutes, 0, 0);
          await tx.seance.update({
            where: { id: s.id },
            data: { dateHeure: newDate }
          });
        }
      }

      // 5) Sync presences with class students for future seances
      if (eleveIds !== undefined && futureSeances.length > 0) {
        // If not fetched above, retrieve current class students
        const classStudents = finalEleveIds !== undefined
          ? finalEleveIds
          : (await tx.classeEleve.findMany({
              where: { classeId: parseInt(id) },
              select: { eleveId: true }
            })).map((r) => r.eleveId);

        for (const s of futureSeances) {
          const presences = await tx.presence.findMany({
            where: { seanceId: s.id },
            select: { eleveId: true }
          });
          const presentIds = new Set(presences.map(p => p.eleveId));
          const targetIds = new Set(classStudents);

          // Determine to add and to delete
          const toAdd = classStudents.filter(eid => !presentIds.has(eid));
          const toDelete = presences.map(p => p.eleveId).filter(eid => !targetIds.has(eid));

          if (toAdd.length > 0) {
            await tx.presence.createMany({
              data: toAdd.map(eid => ({ seanceId: s.id, eleveId: eid, statut: 'no_status' })),
              skipDuplicates: true
            });
          }
          if (toDelete.length > 0) {
            await tx.presence.deleteMany({
              where: { seanceId: s.id, eleveId: { in: toDelete } }
            });
          }
        }
      }
    });

    // Fetch updated class
    const updatedClass = await prisma.classe.findUnique({
      where: { id: parseInt(id) },
      include: {
        teacher: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        eleves: {
          include: {
            eleve: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        seances: {
          orderBy: { dateHeure: 'asc' },
          include: {
            presentTeacher: {
              select: { id: true, nom: true, prenom: true, email: true }
            }
          }
        }
      }
    });

    res.json({
      message: "Classe mise à jour avec succès",
      class: updatedClass
    });
  } catch (err) {
    console.error("Update class error:", err);
    res.status(400).json({ error: "Failed to update class" });
  }
});

// Delete class
router.delete("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.classe.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Classe supprimée avec succès" });
  } catch (err) {
    console.error("Delete class error:", err);
    res.status(400).json({ error: "Failed to delete class" });
  }
});

module.exports = router;