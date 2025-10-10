const express = require('express');
const prisma = require('../config/database');
const { verifyAdminToken } = require('../middleware/auth');

const router = express.Router();

// Get all replacement requests
router.get("/", verifyAdminToken, async (req, res) => {
  try {
    const rrs = await prisma.replacementRequest.findMany({
      include: {
        eleve: {
          select: { id: true, nom: true, prenom: true }
        },
        originSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        },
        destinationSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(rrs);
  } catch (err) {
    console.error("Get RRs error:", err);
    res.status(500).json({ error: "Failed to get replacement requests" });
  }
});

// Create replacement request
router.post("/", verifyAdminToken, async (req, res) => {
  const { eleveId, originSeanceId, destinationSeanceId, notes, rrType, penalizeRR } = req.body;

  if (!eleveId || !originSeanceId || !destinationSeanceId) {
    return res.status(400).json({ error: "eleveId, originSeanceId, and destinationSeanceId are required" });
  }

  try {
    // Verify that the eleve is enrolled in both classes
    const originSeance = await prisma.seance.findUnique({
      where: { id: parseInt(originSeanceId) },
      include: { classe: { include: { eleves: true } } }
    });

    const destSeance = await prisma.seance.findUnique({
      where: { id: parseInt(destinationSeanceId) },
      include: { classe: { include: { eleves: true } } }
    });

    if (!originSeance || !destSeance) {
      return res.status(404).json({ error: "One or both seances not found" });
    }

    const eleveInOrigin = originSeance.classe.eleves.some(ce => ce.eleveId === parseInt(eleveId));
    const eleveInDest = destSeance.classe.eleves.some(ce => ce.eleveId === parseInt(eleveId));

    if (!eleveInOrigin || !eleveInDest) {
      return res.status(400).json({ error: "Eleve must be enrolled in both classes" });
    }

    const rr = await prisma.replacementRequest.create({
      data: {
        eleveId: parseInt(eleveId),
        originSeanceId: parseInt(originSeanceId),
        destinationSeanceId: parseInt(destinationSeanceId),
        notes: notes || null,
        rrType: rrType || 'same_week',
        penalizeRR: penalizeRR !== undefined ? penalizeRR : true
      },
      include: {
        eleve: {
          select: { id: true, nom: true, prenom: true }
        },
        originSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        },
        destinationSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        }
      }
    });

    res.status(201).json({ message: "Replacement request created", rr });
  } catch (err) {
    console.error("Create RR error:", err);
    res.status(500).json({ error: "Failed to create replacement request" });
  }
});

// Get single replacement request
router.get("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const rr = await prisma.replacementRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        eleve: {
          select: { id: true, nom: true, prenom: true }
        },
        originSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        },
        destinationSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        }
      }
    });

    if (!rr) {
      return res.status(404).json({ error: "Replacement request not found" });
      }

    res.json(rr);
  } catch (err) {
    console.error("Get RR error:", err);
    res.status(500).json({ error: "Failed to get replacement request" });
  }
});

// Update replacement request
router.put("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (status && !['open', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be: open, completed, cancelled" });
  }

  try {
    const rr = await prisma.replacementRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined
      },
      include: {
        eleve: {
          select: { id: true, nom: true, prenom: true }
        },
        originSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        },
        destinationSeance: {
          include: {
            classe: {
              select: { id: true, nom: true }
            }
          }
        }
      }
    });

    res.json({ message: "Replacement request updated", rr });
  } catch (err) {
    console.error("Update RR error:", err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: "Replacement request not found" });
    } else {
      res.status(500).json({ error: "Failed to update replacement request" });
    }
  }
});

// Delete replacement request
router.delete("/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const rr = await prisma.replacementRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        eleve: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    if (!rr) {
      return res.status(404).json({ error: "Replacement request not found" });
    }

    await prisma.replacementRequest.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Replacement request deleted", rr });
  } catch (err) {
    console.error("Delete RR error:", err);
    res.status(500).json({ error: "Failed to delete replacement request" });
  }
});

module.exports = router;