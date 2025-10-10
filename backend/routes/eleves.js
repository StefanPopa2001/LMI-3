const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');
const { sanitizeInput, sanitizeEmail, sanitizePhone, DEBUG_NO_VALIDATION } = require('../middleware/validation');

const router = express.Router();

// Get all eleves
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const eleves = await prisma.eleve.findMany();
    res.json(eleves);
  } catch (err) {
    console.error("Get eleves error:", err);
    res.status(500).json({ error: "Failed to fetch eleves" });
  }
});

// Create new eleve (debug mode can bypass validation)
router.post("/", verifyAdminToken, async (req, res) => {
  let eleveData = { ...req.body };

  // Provide placeholders in debug mode
  if (DEBUG_NO_VALIDATION) {
    if (!eleveData.nom) eleveData.nom = 'Debug';
    if (!eleveData.prenom) eleveData.prenom = 'Eleve';
    if (!eleveData.dateNaissance) eleveData.dateNaissance = '2010-01-01';
  } else {
    // Strict validation only when not debug
    if (!eleveData.nom || eleveData.nom.trim() === '') {
      return res.status(400).json({ error: "Le nom de l'élève est requis" });
    }
    if (!eleveData.prenom || eleveData.prenom.trim() === '') {
      return res.status(400).json({ error: "Le prénom de l'élève est requis" });
    }
    if (!eleveData.dateNaissance) {
      return res.status(400).json({ error: "La date de naissance est requise" });
    }
  }

  // Flexible date parsing
  let dateNaissance;
  if (eleveData.dateNaissance) {
    if (eleveData.dateNaissance.includes && eleveData.dateNaissance.includes('T')) {
      dateNaissance = new Date(eleveData.dateNaissance);
    } else {
      dateNaissance = new Date(eleveData.dateNaissance + 'T00:00:00');
    }
    if (isNaN(dateNaissance.getTime())) {
      if (!DEBUG_NO_VALIDATION) {
        return res.status(400).json({ error: "Format de date de naissance invalide" });
      } else {
        dateNaissance = new Date('2010-01-01T00:00:00');
      }
    }
  }

  if (!DEBUG_NO_VALIDATION) {
    if (eleveData.nom) eleveData.nom = sanitizeInput(eleveData.nom);
    if (eleveData.prenom) eleveData.prenom = sanitizeInput(eleveData.prenom);
    if (eleveData.nomCompletParent) eleveData.nomCompletParent = sanitizeInput(eleveData.nomCompletParent);
    if (eleveData.nomCompletResponsable1) eleveData.nomCompletResponsable1 = sanitizeInput(eleveData.nomCompletResponsable1);
    if (eleveData.nomCompletResponsable2) eleveData.nomCompletResponsable2 = sanitizeInput(eleveData.nomCompletResponsable2);
    if (eleveData.nomCompletResponsable3) eleveData.nomCompletResponsable3 = sanitizeInput(eleveData.nomCompletResponsable3);
    if (eleveData.mailResponsable1) eleveData.mailResponsable1 = sanitizeEmail(eleveData.mailResponsable1);
    if (eleveData.mailResponsable2) eleveData.mailResponsable2 = sanitizeEmail(eleveData.mailResponsable2);
    if (eleveData.mailResponsable3) eleveData.mailResponsable3 = sanitizeEmail(eleveData.mailResponsable3);
    if (eleveData.gsmResponsable1) eleveData.gsmResponsable1 = sanitizePhone(eleveData.gsmResponsable1);
    if (eleveData.gsmResponsable2) eleveData.gsmResponsable2 = sanitizePhone(eleveData.gsmResponsable2);
    if (eleveData.gsmResponsable3) eleveData.gsmResponsable3 = sanitizePhone(eleveData.gsmResponsable3);
  }

  try {
    const { id, ...eleveDataWithoutId } = eleveData;
    if (dateNaissance) eleveDataWithoutId.dateNaissance = dateNaissance.toISOString();
    const newEleve = await prisma.eleve.create({ data: eleveDataWithoutId });
    res.json({ message: "Eleve created successfully", eleve: newEleve, debug: DEBUG_NO_VALIDATION });
  } catch (err) {
    console.error("Create eleve error:", err);
    res.status(500).json({ error: "Failed to create eleve" });
  }
});

// Update eleve (skip sanitization in debug)
router.put("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  let updateData = { ...req.body };

  if (!DEBUG_NO_VALIDATION) {
    if (updateData.nom) updateData.nom = sanitizeInput(updateData.nom);
    if (updateData.prenom) updateData.prenom = sanitizeInput(updateData.prenom);
    if (updateData.nomCompletParent) updateData.nomCompletParent = sanitizeInput(updateData.nomCompletParent);
    if (updateData.nomCompletResponsable1) updateData.nomCompletResponsable1 = sanitizeInput(updateData.nomCompletResponsable1);
    if (updateData.nomCompletResponsable2) updateData.nomCompletResponsable2 = sanitizeInput(updateData.nomCompletResponsable2);
    if (updateData.nomCompletResponsable3) updateData.nomCompletResponsable3 = sanitizeInput(updateData.nomCompletResponsable3);
    if (updateData.mailResponsable1) updateData.mailResponsable1 = sanitizeEmail(updateData.mailResponsable1);
    if (updateData.mailResponsable2) updateData.mailResponsable2 = sanitizeEmail(updateData.mailResponsable2);
    if (updateData.mailResponsable3) updateData.mailResponsable3 = sanitizeEmail(updateData.mailResponsable3);
    if (updateData.gsmResponsable1) updateData.gsmResponsable1 = sanitizePhone(updateData.gsmResponsable1);
    if (updateData.gsmResponsable2) updateData.gsmResponsable2 = sanitizePhone(updateData.gsmResponsable2);
    if (updateData.gsmResponsable3) updateData.gsmResponsable3 = sanitizePhone(updateData.gsmResponsable3);
  }

  try {
    const eleve = await prisma.eleve.update({ where: { id: parseInt(id) }, data: updateData });
    res.json({ message: "Eleve updated successfully", eleve, debug: DEBUG_NO_VALIDATION });
  } catch (err) {
    console.error("Update eleve error:", err);
    res.status(400).json({ error: "Failed to update eleve" });
  }
});

// Delete eleve
router.delete("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.eleve.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: "Eleve deleted successfully" });
  } catch (err) {
    console.error("Delete eleve error:", err);
    res.status(400).json({ error: "Failed to delete eleve" });
  }
});

// Get detailed eleve info including related seances & attendance
router.get('/:id/details', verifyAdminToken, async (req, res) => {
  try {
    const eleveId = parseInt(req.params.id);
    const eleve = await prisma.eleve.findUnique({ where: { id: eleveId } });
    if (!eleve) return res.status(404).json({ error: 'Eleve not found' });

    // Fetch all classes the student is enrolled in and their seances
    const classeLinks = await prisma.classeEleve.findMany({
      where: { eleveId },
      include: {
        classe: {
          include: {
            seances: true,
            teacher: { select: { id: true, nom: true, prenom: true } }
          }
        }
      }
    });

    const allSeanceIds = classeLinks.flatMap(cl => cl.classe.seances.map(s => s.id));

    let presences = [];
    if (allSeanceIds.length) {
      presences = await prisma.presence.findMany({
        where: { eleveId, seanceId: { in: allSeanceIds } },
        select: { id: true, seanceId: true, statut: true, notes: true }
      });
    }

    // Replacement requests (origin or destination) for this eleve
    const [originRRs, destinationRRs] = await Promise.all([
      prisma.replacementRequest.findMany({
        where: { eleveId, status: { not: 'cancelled' } },
        select: { id: true, originSeanceId: true, destinationSeanceId: true, status: true, destStatut: true, rrType: true }
      }),
      prisma.replacementRequest.findMany({
        where: { eleveId, status: { not: 'cancelled' } }, // same query but we'll separate mapping below
        select: { id: true, originSeanceId: true, destinationSeanceId: true, status: true, destStatut: true, rrType: true }
      })
    ]); // (kept symmetrical if future differentiation is needed)

    // Build seance details with attendance statut
    const seancesDetailed = classeLinks.flatMap(cl => cl.classe.seances.map(se => {
      const presence = presences.find(p => p.seanceId === se.id);
      const rrOrigin = originRRs.find(r => r.originSeanceId === se.id);
      const rrDest = destinationRRs.find(r => r.destinationSeanceId === se.id);
      return {
        id: se.id,
          dateHeure: se.dateHeure,
          duree: se.duree,
          statut: se.statut,
          weekNumber: se.weekNumber,
          classe: { id: cl.classe.id, nom: cl.classe.nom, level: cl.classe.level, teacher: cl.classe.teacher },
          attendance: presence ? { presenceId: presence.id, statut: presence.statut, notes: presence.notes } : null,
          rr: rrOrigin ? { type: 'origin', id: rrOrigin.id, destStatut: rrOrigin.destStatut } : rrDest ? { type: 'destination', id: rrDest.id, destStatut: rrDest.destStatut } : null
        };
      }));

    // Sort seances by date
    seancesDetailed.sort((a,b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime());

    res.json({ eleve, seances: seancesDetailed });
  } catch (err) {
    console.error('Get eleve details error:', err);
    res.status(500).json({ error: 'Failed to fetch eleve details' });
  }
});

module.exports = router;