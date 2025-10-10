const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');

const router = express.Router();

// Get seances for a class
router.get("/:id/seances", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const seances = await prisma.seance.findMany({
      where: { classeId: parseInt(id) },
      orderBy: { dateHeure: 'asc' }
    });
    res.json(seances);
  } catch (err) {
    console.error("Get seances error:", err);
    res.status(500).json({ error: "Failed to fetch seances" });
  }
});

// Create seance
router.post("/:id/seances", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let { dateHeure, duree, notes, presentTeacherId, weekNumber, rrPossibles } = req.body;

  if (!dateHeure) {
    return res.status(400).json({ error: "Date et heure de la séance requises" });
  }

  // Sanitize inputs
  if (notes) notes = sanitizeInput(notes);

  try {
    // Get class default duration if not provided
    const classe = await prisma.classe.findUnique({
      where: { id: parseInt(id) },
      select: { dureeSeance: true, rrPossibles: true, teacherId: true }
    });
    if (!duree) {
      duree = classe?.dureeSeance || 60;
    }

    // Determine rrPossibles from class if not provided
    const seanceRr = rrPossibles !== undefined ? !!rrPossibles : !!classe?.rrPossibles;

    // Compute weekNumber if not provided: position when sorted by dateHeure ascending
    let computedWeekNumber = weekNumber ? parseInt(weekNumber) : undefined;
    if (computedWeekNumber === undefined) {
      const existing = await prisma.seance.findMany({
        where: { classeId: parseInt(id) },
        orderBy: { dateHeure: 'asc' },
        select: { dateHeure: true }
      });
      const allDates = [...existing.map(e => e.dateHeure.getTime()), new Date(dateHeure).getTime()].sort((a,b)=>a-b);
      computedWeekNumber = allDates.indexOf(new Date(dateHeure).getTime()) + 1;
    }

    const seance = await prisma.seance.create({
      data: {
        classeId: parseInt(id),
        dateHeure: new Date(dateHeure),
        duree: parseInt(duree),
        notes,
        rrPossibles: seanceRr,
        weekNumber: computedWeekNumber,
        presentTeacherId: presentTeacherId ? parseInt(presentTeacherId) : null
      },
      include: {
        presentTeacher: {
          select: { id: true, nom: true, prenom: true, email: true }
        }
      }
    });

    res.json({
      message: "Séance créée avec succès",
      seance
    });
  } catch (err) {
    console.error("Create seance error:", err);
    res.status(500).json({ error: "Failed to create seance" });
  }
});

// Update seance
router.put("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let { dateHeure, duree, statut, notes, weekNumber, presentTeacherId, rrPossibles } = req.body;

  // Sanitize inputs
  if (notes) notes = sanitizeInput(notes);
  if (statut) statut = sanitizeInput(statut);

  try {
    const updateData = {};
    if (dateHeure) updateData.dateHeure = new Date(dateHeure);
    if (duree) updateData.duree = parseInt(duree);
    if (statut) updateData.statut = statut;
    if (notes !== undefined) updateData.notes = notes;
    if (weekNumber !== undefined) updateData.weekNumber = parseInt(weekNumber);
    if (presentTeacherId !== undefined) updateData.presentTeacherId = presentTeacherId ? parseInt(presentTeacherId) : null;
    if (rrPossibles !== undefined) updateData.rrPossibles = !!rrPossibles;

    const seance = await prisma.seance.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        presentTeacher: {
          select: { id: true, nom: true, prenom: true, email: true }
        }
      }
    });

    res.json({
      message: "Séance mise à jour avec succès",
      seance
    });
  } catch (err) {
    console.error("Update seance error:", err);
    res.status(400).json({ error: "Failed to update seance" });
  }
});

// Delete seance
router.delete("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.seance.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Séance supprimée avec succès" });
  } catch (err) {
    console.error("Delete seance error:", err);
    res.status(400).json({ error: "Failed to delete seance" });
  }
});

// Generate seances based on week numbers
router.post("/:id/generate-seances", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let { annee, jourSemaine, heureDebut } = req.body;

  if (!annee || !jourSemaine || !heureDebut) {
    return res.status(400).json({ error: "Année, jour de la semaine et heure de début requis" });
  }

  try {
    const classe = await prisma.classe.findUnique({
      where: { id: parseInt(id) },
      select: { semainesSeances: true, dureeSeance: true, rrPossibles: true }
    });

    if (!classe) {
      return res.status(404).json({ error: "Classe non trouvée" });
    }

    const semainesSeances = JSON.parse(classe.semainesSeances);
    const seancesToCreate = [];

    // Generate seances for each week
    for (const weekNumber of semainesSeances) {
      // Calculate the date for the specified day of the week in the given week
      const firstDayOfYear = new Date(annee, 0, 1);
      const dayOfWeek = firstDayOfYear.getDay();
      const daysToFirstMonday = (8 - dayOfWeek) % 7;
      const firstMonday = new Date(annee, 0, 1 + daysToFirstMonday);

      // Calculate the date for the specified week and day
      const targetDate = new Date(firstMonday);
      targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7 + (jourSemaine - 1));

      // Set the time
      const [hours, minutes] = heureDebut.split(':');
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      seancesToCreate.push({
        classeId: parseInt(id),
        dateHeure: targetDate,
        duree: classe.dureeSeance
      });
    }

    // Sort by date then number them sequentially for weekNumber
    seancesToCreate.sort((a,b) => a.dateHeure.getTime() - b.dateHeure.getTime());
    const dataWithMeta = seancesToCreate.map((s, idx) => ({
      ...s,
      rrPossibles: !!classe.rrPossibles,
      weekNumber: idx + 1
    }));

    // Create all seances
    await prisma.seance.createMany({
      data: dataWithMeta,
      skipDuplicates: true
    });

    res.json({
      message: `${seancesToCreate.length} séances générées avec succès`,
      count: seancesToCreate.length
    });
  } catch (err) {
    console.error("Generate seances error:", err);
    res.status(500).json({ error: "Failed to generate seances" });
  }
});

module.exports = router;