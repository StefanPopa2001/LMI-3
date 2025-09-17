const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const prisma = new PrismaClient();
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

// Handle Redis connection errors gracefully
redisClient.on('error', (err) => {
  console.warn('Redis connection error:', err.message);
  console.warn('Continuing without Redis...');
});

// Connect to Redis with error handling
redisClient.connect().catch((err) => {
  console.warn('Failed to connect to Redis:', err.message);
  console.warn('Continuing without Redis...');
});

// JWT Secret Key
const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key-change-this-in-production";

// Input sanitization functions
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return validator.normalizeEmail(email.trim()) || '';
}

function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  // Remove all non-numeric characters except + and leading zeros
  return phone.trim().replace(/[^\d+]/g, '');
}

// Enhanced password validation
function validatePassword(password) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
  }
  if (/(.)\1{2,}/.test(password)) {
    return "Password cannot contain repeated characters";
  }
  // Check for common weak patterns
  const weakPatterns = ['123456', 'password', 'qwerty', 'admin'];
  const lowerPassword = password.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerPassword.includes(pattern)) {
      return "Password cannot contain common weak patterns";
    }
  }
  return null;
}

// Rate limiting configuration (anti brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth routes
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false
});

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access token is required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ error: "Admin privileges required" });
  }
  next();
};

// Combined middleware for admin authentication
const verifyAdminToken = [authenticate, requireAdmin];

const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
};

async function startServer() {
  console.log('🚀 Starting server...');
  
  const app = express();

  // Use body parser and CORS before registering any routes (important for /graphql)
  // Echo the request origin when credentials are allowed to avoid Access-Control-Allow-Origin: '*'
  app.use(express.json());
  app.use(cors({
    origin: [
      'http://localhost:3000',  // Next.js frontend in development
      'http://127.0.0.1:3000',  // Alternative localhost
      'http://localhost:3002',  // Next.js frontend alternative port
      'http://127.0.0.1:3002',  // Alternative localhost port 3002
      'http://frontend:3000',   // Docker container name
      'http://0.0.0.0:3000',    // Docker all interfaces
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
  }));

  // Additional CORS debugging and manual preflight handling
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`${req.method} ${req.path} - Origin: ${origin}`);
    
    // Manually handle preflight requests if needed
    if (req.method === 'OPTIONS') {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000', 
        'http://localhost:3002',
        'http://127.0.0.1:3002',
        'http://frontend:3000',
        'http://0.0.0.0:3000'
      ];
      
      if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.sendStatus(200);
    }
    next();
  });

  const server = new ApolloServer({ typeDefs, resolvers });

  await server.start();

  // Register GraphQL endpoint after CORS and body parser so preflight and headers are handled
  app.use('/graphql', express.json(), expressMiddleware(server));

  // ==================== HEALTH CHECK ENDPOINT ====================
  
  app.get('/', (req, res) => {
    res.json({ message: 'Backend server is running', timestamp: new Date().toISOString() });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is healthy' });
  });

  // ==================== USER AUTHENTICATION ENDPOINTS ====================

  // Get user salt for secure login
  app.post("/users/getSalt", authLimiter, async (req, res) => {
    const { email } = req.body;
    
    // Normalize and sanitize the email
    const normalizedEmail = sanitizeEmail(email);

    try {
      const user = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        select: { sel: true }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ salt: user.sel });
    } catch (err) {
      console.error("Get salt error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Login user
  app.post("/users/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    // Normalize and sanitize the email
    const normalizedEmail = sanitizeEmail(email);

    try {
      const user = await prisma.user.findFirst({
        where: { email: normalizedEmail }
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      if (user.mdp !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, admin: user.admin },
        SECRET_KEY,
        { expiresIn: "24h" }
      );

      // Check if password is temporary
      const response = {
        token,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          admin: user.admin,
          mdpTemporaire: user.mdpTemporaire
        }
      };

      if (user.mdpTemporaire) {
        response.requirePasswordChange = true;
        response.message = "You must change your password before continuing";
      }

      res.json(response);
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Change password (for first-time login or user-initiated change)
  app.post("/users/changePassword", authenticate, async (req, res) => {
    const { currentPassword, newPassword, salt } = req.body;
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If not temporary password, verify current password
      if (!user.mdpTemporaire && user.mdp !== currentPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Validate new password (skip validation for first-time login)
      if (!user.mdpTemporaire) {
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
          return res.status(400).json({ error: passwordError });
        }
      }

      // Update password and remove temporary flag
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          mdp: newPassword,
          sel: salt,
          mdpTemporaire: false
        }
      });

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================

  // Create new user
  app.post("/admin/users", verifyAdminToken, async (req, res) => {
    let { 
      email, 
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

    // Sanitize inputs
    nom = sanitizeInput(nom);
    prenom = sanitizeInput(prenom);
    email = sanitizeEmail(email);
    GSM = sanitizePhone(GSM);
    titre = sanitizeInput(titre);
    fonction = sanitizeInput(fonction);

    // Validate required fields
    if (!email || !nom || !prenom || !mdp || !sel) {
      return res.status(400).json({ error: "Email, name, surname, password and salt are required" });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate name format (only letters and spaces)
    const nameRegex = /^[a-zA-Z ]+$/;
    if (!nameRegex.test(nom) || !nameRegex.test(prenom)) {
      return res.status(400).json({ error: "Names can only contain letters and spaces" });
    }

    try {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email,
          GSM,
          mdp,
          sel,
          titre,
          fonction,
          nom,
          prenom,
          admin,
          niveau,
          
          mdpTemporaire: true, // Always true for admin-created users
          entreeFonction: new Date()
        }
      });

      // Return user without sensitive data
      const { mdp: _, sel: __, ...userResponse } = newUser;
      res.json({
        message: "User created successfully",
        user: userResponse
      });

    } catch (err) {
      console.error("Create user error:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Reset user password
  app.post("/admin/users/:id/resetPassword", verifyAdminToken, async (req, res) => {
    const { id } = req.params;
    const { newPassword, salt } = req.body;

    if (!newPassword || !salt) {
      return res.status(400).json({ error: "New password and salt are required" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update password and set temporary flag
      await prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          mdp: newPassword,
          sel: salt,
          mdpTemporaire: true // User must change password on next login
        }
      });

      res.json({ message: "Password reset successfully. User must change password on next login." });

    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get all users
  app.get("/admin/users", verifyAdminToken, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
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
      res.json(users);
    } catch (err) {
      console.error("Get users error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update user
  app.put("/admin/users/:id", verifyAdminToken, async (req, res) => {
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
    if (updateData.GSM) updateData.GSM = sanitizePhone(updateData.GSM);
    if (updateData.titre) updateData.titre = sanitizeInput(updateData.titre);
    if (updateData.fonction) updateData.fonction = sanitizeInput(updateData.fonction);

    try {
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
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
        message: "User updated successfully",
        user
      });
    } catch (err) {
      console.error("Update user error:", err);
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  // Deactivate user - Soft delete
  app.put("/admin/users/:id/deactivate", verifyAdminToken, async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.user.update({
        where: { id: parseInt(id) },
        data: {}
      });
      res.json({ message: "User deactivated successfully" });
    } catch (err) {
      console.error("Deactivate user error:", err);
      res.status(400).json({ error: "Failed to deactivate user" });
    }
  });

  // Activate user
  app.put("/admin/users/:id/activate", verifyAdminToken, async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.user.update({
        where: { id: parseInt(id) },
        data: {}
      });
      res.json({ message: "User activated successfully" });
    } catch (err) {
      console.error("Activate user error:", err);
      res.status(400).json({ error: "Failed to activate user" });
    }
  });

  // Delete user (hard delete)
  app.delete("/admin/users/:id", verifyAdminToken, async (req, res) => {
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

  // ==================== USER PROFILE ENDPOINTS ====================

  // Get user profile
  app.get("/users/profile", authenticate, async (req, res) => {
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
  app.put("/users/profile", authenticate, async (req, res) => {
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

  // ==================== ELEVE MANAGEMENT ENDPOINTS ====================

  // Get all eleves
  app.get("/admin/eleves", authenticate, requireAdmin, async (req, res) => {
    try {
      const eleves = await prisma.eleve.findMany();
      res.json(eleves);
    } catch (err) {
      console.error("Get eleves error:", err);
      res.status(500).json({ error: "Failed to fetch eleves" });
    }
  });

  // Create new eleve
  app.post("/admin/eleves", authenticate, requireAdmin, async (req, res) => {
    let eleveData = { ...req.body };

    // Validate required fields
    if (!eleveData.nom || eleveData.nom.trim() === '') {
      return res.status(400).json({ error: "Le nom de l'élève est requis" });
    }
    if (!eleveData.prenom || eleveData.prenom.trim() === '') {
      return res.status(400).json({ error: "Le prénom de l'élève est requis" });
    }
    if (!eleveData.dateNaissance) {
      return res.status(400).json({ error: "La date de naissance est requise" });
    }

    // Validate date format
    let dateNaissance;
    if (eleveData.dateNaissance.includes('T')) {
      dateNaissance = new Date(eleveData.dateNaissance); // ISO format
    } else {
      dateNaissance = new Date(eleveData.dateNaissance + 'T00:00:00'); // YYYY-MM-DD format
    }
    if (isNaN(dateNaissance.getTime())) {
      console.error('Invalid date received:', eleveData.dateNaissance);
      return res.status(400).json({ error: "Format de date de naissance invalide" });
    }

    // Sanitize inputs
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

    try {
      // Remove id field if present (it's auto-generated)
      const { id, ...eleveDataWithoutId } = eleveData;

      // Ensure dateNaissance is in ISO format for Prisma
      if (eleveDataWithoutId.dateNaissance) {
        eleveDataWithoutId.dateNaissance = dateNaissance.toISOString();
      }

      const newEleve = await prisma.eleve.create({
        data: eleveDataWithoutId
      });
      res.json({
        message: "Eleve created successfully",
        eleve: newEleve
      });
    } catch (err) {
      console.error("Create eleve error:", err);
      res.status(500).json({ error: "Failed to create eleve" });
    }
  });

  // Update eleve
  app.put("/admin/eleves/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Sanitize inputs
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

    try {
      const eleve = await prisma.eleve.update({
        where: { id: parseInt(id) },
        data: updateData
      });
      res.json({
        message: "Eleve updated successfully",
        eleve
      });
    } catch (err) {
      console.error("Update eleve error:", err);
      res.status(400).json({ error: "Failed to update eleve" });
    }
  });

  // Delete eleve
  app.delete("/admin/eleves/:id", authenticate, requireAdmin, async (req, res) => {
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

  // ==================== CLASS MANAGEMENT ENDPOINTS ====================

  // Get all classes
  app.get("/admin/classes", authenticate, requireAdmin, async (req, res) => {
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
  app.get("/admin/classes/:id", authenticate, async (req, res) => {
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
  app.post("/admin/classes", authenticate, requireAdmin, async (req, res) => {
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
  app.put("/admin/classes/:id", authenticate, requireAdmin, async (req, res) => {
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
  app.delete("/admin/classes/:id", authenticate, requireAdmin, async (req, res) => {
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

  // ==================== SEANCE MANAGEMENT ENDPOINTS ====================

  // Get seances for a class
  app.get("/admin/classes/:id/seances", authenticate, async (req, res) => {
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
  app.post("/admin/classes/:id/seances", authenticate, requireAdmin, async (req, res) => {
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
  app.put("/admin/seances/:id", authenticate, requireAdmin, async (req, res) => {
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
  app.delete("/admin/seances/:id", authenticate, requireAdmin, async (req, res) => {
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
  app.post("/admin/classes/:id/generate-seances", authenticate, requireAdmin, async (req, res) => {
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

  // ==================== SETTINGS MANAGEMENT ENDPOINTS ====================

  // Get all settings grouped by category
  app.get("/admin/settings", authenticate, requireAdmin, async (req, res) => {
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
  app.get("/admin/settings/:category", authenticate, async (req, res) => {
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
  app.post("/admin/settings", authenticate, requireAdmin, async (req, res) => {
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
  app.put("/admin/settings/:id", authenticate, requireAdmin, async (req, res) => {
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
  app.delete("/admin/settings/:id", authenticate, requireAdmin, async (req, res) => {
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
  app.post("/admin/settings/initialize", authenticate, requireAdmin, async (req, res) => {
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

  // Attendance management endpoints

  // Get seances for a specific week
  app.get('/admin/attendance/week/:startDate', verifyAdminToken, async (req, res) => {
    try {
      const startDate = new Date(req.params.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // Add 6 days to get the full week
      endDate.setHours(23, 59, 59, 999); // End of day

      const seances = await prisma.seance.findMany({
        where: {
          dateHeure: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          classe: {
            include: {
              teacher: true,
              eleves: {
                include: {
                  eleve: true
                }
              }
            }
          },
          presences: {
            include: {
              eleve: true
            }
          }
        },
        orderBy: {
          dateHeure: 'asc'
        }
      });
      // isRecuperation is now part of classe model; returned automatically

      // Attach RR info & ensure destination RR students appear in presences even if not part of classe.eleves yet
      const seanceIds = seances.map(s => s.id);
      const rrBySeanceDest = await prisma.replacementRequest.findMany({
        where: { destinationSeanceId: { in: seanceIds }, status: { not: 'cancelled' } },
        select: { id: true, eleveId: true, destinationSeanceId: true, status: true, destStatut: true }
      });
      const rrBySeanceOrigin = await prisma.replacementRequest.findMany({
        where: { originSeanceId: { in: seanceIds }, status: { not: 'cancelled' } },
        select: { id: true, eleveId: true, originSeanceId: true, status: true, destStatut: true }
      });

      const rrDestMap = new Map(); // seanceId -> array
      const rrOriginMap = new Map();
      for (const rr of rrBySeanceDest) {
        if (!rrDestMap.has(rr.destinationSeanceId)) rrDestMap.set(rr.destinationSeanceId, []);
        rrDestMap.get(rr.destinationSeanceId).push(rr);
      }
      for (const rr of rrBySeanceOrigin) {
        if (!rrOriginMap.has(rr.originSeanceId)) rrOriginMap.set(rr.originSeanceId, []);
        rrOriginMap.get(rr.originSeanceId).push(rr);
      }

      // Fetch all involved eleves to build synthetic presence entries if needed
      const rrEleveIds = Array.from(new Set(rrBySeanceDest.map(r => r.eleveId)));
      let rrEleves = [];
      if (rrEleveIds.length) {
        rrEleves = await prisma.eleve.findMany({ where: { id: { in: rrEleveIds } }, select: { id: true, nom: true, prenom: true } });
      }
      const eleveMap = new Map(rrEleves.map(e => [e.id, e]));

      const enriched = seances.map(s => {
        const destRRs = rrDestMap.get(s.id) || [];
        const originRRs = rrOriginMap.get(s.id) || [];
        const existingPresenceEleveIds = new Set(s.presences.map(p => p.eleveId));
        const syntheticPresences = [];
        for (const rr of destRRs) {
          if (!existingPresenceEleveIds.has(rr.eleveId)) {
            const el = eleveMap.get(rr.eleveId);
            if (el) {
              syntheticPresences.push({
                id: -1 * (100000 + rr.eleveId + s.id), // negative synthetic id
                seanceId: s.id,
                eleveId: rr.eleveId,
                statut: rr.destStatut || 'no_status',
                notes: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                eleve: el
              });
            }
          }
        }
        return {
          ...s,
          presences: [...s.presences, ...syntheticPresences],
          rrMap: { origin: originRRs, destination: destRRs }
        };
      });

      res.json(enriched);
    } catch (err) {
      console.error("Get weekly seances error:", err);
      res.status(500).json({ error: "Failed to fetch weekly seances" });
    }
  });

  // Get attendance for a specific seance
  app.get('/admin/seances/:id/attendance', verifyAdminToken, async (req, res) => {
    try {
      const seanceId = parseInt(req.params.id);

      const seance = await prisma.seance.findUnique({
        where: { id: seanceId },
        include: {
          classe: {
            include: {
              teacher: true,
              eleves: {
                include: {
                  eleve: true
                }
              }
            }
          },
          presences: {
            include: {
              eleve: true
            }
          }
        }
      });

      if (!seance) {
        return res.status(404).json({ error: "Seance not found" });
      }

      // Create attendance records for all students if they don't exist
      const existingPresences = seance.presences.map(p => p.eleveId);
      const missingStudents = seance.classe.eleves.filter(ce => !existingPresences.includes(ce.eleve.id));

      if (missingStudents.length > 0) {
        await prisma.presence.createMany({
          data: missingStudents.map(ce => ({
            seanceId: seanceId,
            eleveId: ce.eleve.id,
            statut: 'no_status'
          })),
          skipDuplicates: true
        });

        // Refetch the seance with updated presences
        const updatedSeance = await prisma.seance.findUnique({
          where: { id: seanceId },
          include: {
            classe: {
              include: {
                eleves: {
                  include: {
                    eleve: true
                  }
                }
              }
            },
            presences: {
              include: {
                eleve: true
              }
            }
          }
        });

        // Attach RR info
        const [originRRs, destinationRRs] = await Promise.all([
          prisma.replacementRequest.findMany({
            where: { originSeanceId: seanceId, status: { not: 'cancelled' } },
            select: { id: true, eleveId: true, destinationSeanceId: true, status: true, destStatut: true }
          }),
          prisma.replacementRequest.findMany({
            where: { destinationSeanceId: seanceId, status: { not: 'cancelled' } },
            select: { id: true, eleveId: true, originSeanceId: true, status: true, destStatut: true }
          })
        ]);
        return res.json({ ...updatedSeance, rrMap: { origin: originRRs, destination: destinationRRs } });
      }

      // Attach RR info
      const [originRRs, destinationRRs] = await Promise.all([
        prisma.replacementRequest.findMany({
          where: { originSeanceId: seanceId, status: { not: 'cancelled' } },
          select: { id: true, eleveId: true, destinationSeanceId: true, status: true, destStatut: true }
        }),
        prisma.replacementRequest.findMany({
          where: { destinationSeanceId: seanceId, status: { not: 'cancelled' } },
          select: { id: true, eleveId: true, originSeanceId: true, status: true, destStatut: true }
        })
      ]);
      // Ensure destination RR students appear even if not part of classe.eleves
      const existingPresenceEleveIds2 = new Set(seance.presences.map(p => p.eleveId));
      const missingDestEleveIds = destinationRRs.filter(r => !existingPresenceEleveIds2.has(r.eleveId)).map(r => r.eleveId);
      let syntheticPresences2 = [];
      if (missingDestEleveIds.length) {
        const eles = await prisma.eleve.findMany({ where: { id: { in: missingDestEleveIds } }, select: { id: true, nom: true, prenom: true } });
        syntheticPresences2 = eles.map(el => ({
          id: -1 * (200000 + el.id + seanceId),
          seanceId: seanceId,
          eleveId: el.id,
          statut: 'no_status',
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          eleve: el
        }));
      }

      res.json({ ...seance, presences: [...seance.presences, ...syntheticPresences2], rrMap: { origin: originRRs, destination: destinationRRs } });
    } catch (err) {
      console.error("Get seance attendance error:", err);
      res.status(500).json({ error: "Failed to fetch seance attendance" });
    }
  });

  // Update attendance for a student in a seance
  app.put('/admin/attendance/:presenceId', verifyAdminToken, async (req, res) => {
    try {
      const presenceId = parseInt(req.params.presenceId);
      const { statut, notes } = req.body;

      // Validate status
      const validStatuses = ['present', 'absent', 'no_status', 'awaiting'];
      if (!validStatuses.includes(statut)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updatedPresence = await prisma.presence.update({
        where: { id: presenceId },
        data: {
          statut: sanitizeInput(statut),
          notes: notes ? sanitizeInput(notes) : null,
          updatedAt: new Date()
        },
        include: {
          eleve: true,
          seance: {
            include: {
              classe: true
            }
          }
        }
      });

      // If this presence is the destination of an RR, mirror to RR and origin presence
      try {
        // Find RR by destination seance and eleve
        const rr = await prisma.replacementRequest.findFirst({
          where: {
            destinationSeanceId: updatedPresence.seanceId,
            eleveId: updatedPresence.eleveId,
            status: { not: 'cancelled' }
          }
        });
        if (rr) {
          const reflected = statut === 'present' ? 'present' : (statut === 'absent' ? 'absent' : 'awaiting');
          await prisma.$transaction(async (tx) => {
            await tx.replacementRequest.update({
              where: { id: rr.id },
              data: {
                destStatut: sanitizeInput(statut),
                status: statut !== 'no_status' ? 'completed' : 'open'
              }
            });
            // Mirror to origin presence based on originSeanceId + eleveId
            await tx.presence.upsert({
              where: { seanceId_eleveId: { seanceId: rr.originSeanceId, eleveId: rr.eleveId } },
              create: { seanceId: rr.originSeanceId, eleveId: rr.eleveId, statut: reflected },
              update: { statut: reflected }
            });
          });
        }
      } catch (e) {
        console.warn('RR propagation warning:', e.message);
      }

      res.json(updatedPresence);
    } catch (err) {
      console.error("Update attendance error:", err);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  // Bulk update attendance for a seance
  app.put('/admin/seances/:id/attendance', verifyAdminToken, async (req, res) => {
    try {
      const seanceId = parseInt(req.params.id);
      const { attendanceUpdates } = req.body; // Array of { eleveId, statut, notes }

      if (!Array.isArray(attendanceUpdates)) {
        return res.status(400).json({ error: "attendanceUpdates must be an array" });
      }

      const validStatuses = ['present', 'absent', 'no_status', 'awaiting'];
      
      // Validate all updates before applying
      for (const update of attendanceUpdates) {
        if (!validStatuses.includes(update.statut)) {
          return res.status(400).json({ error: `Invalid status: ${update.statut}` });
        }
      }

      // Apply all updates
      const updatePromises = attendanceUpdates.map(update => 
        prisma.presence.updateMany({
          where: {
            seanceId: seanceId,
            eleveId: update.eleveId
          },
          data: {
            statut: sanitizeInput(update.statut),
            notes: update.notes ? sanitizeInput(update.notes) : null,
            updatedAt: new Date()
          }
        })
      );

      await Promise.all(updatePromises);

      // Return updated seance with attendance
  const updatedSeance = await prisma.seance.findUnique({
        where: { id: seanceId },
        include: {
          classe: {
            include: {
              eleves: {
                include: {
                  eleve: true
                }
              }
            }
          },
          presences: {
            include: {
              eleve: true
            }
          }
        }
      });

  res.json(updatedSeance);
    } catch (err) {
      console.error("Bulk update attendance error:", err);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  });

  // ==================== STATS ENDPOINTS ====================

  // Get attendance stats by level and teacher
  app.get('/admin/stats', verifyAdminToken, async (req, res) => {
    try {
      // Get all presences with related data
      const presences = await prisma.presence.findMany({
        include: {
          seance: {
            include: {
              classe: {
                include: {
                  teacher: {
                    select: {
                      id: true,
                      nom: true,
                      prenom: true
                    }
                  }
                }
              }
            }
          },
          eleve: true
        }
      });

      // Group by level
      const levelStats = {};
      const teacherStats = {};

      presences.forEach(presence => {
        const level = presence.seance.classe.level || 'Unknown';
        const teacherId = presence.seance.classe.teacherId;
        const teacherName = `${presence.seance.classe.teacher.prenom} ${presence.seance.classe.teacher.nom}`;

        // Level stats
        if (!levelStats[level]) {
          levelStats[level] = { total: 0, present: 0 };
        }
        levelStats[level].total++;
        if (presence.statut === 'present') {
          levelStats[level].present++;
        }

        // Teacher stats
        if (!teacherStats[teacherId]) {
          teacherStats[teacherId] = { name: teacherName, total: 0, present: 0 };
        }
        teacherStats[teacherId].total++;
        if (presence.statut === 'present') {
          teacherStats[teacherId].present++;
        }
      });

      // Calculate percentages
      const levelStatsWithPercent = Object.entries(levelStats).map(([level, stats]) => ({
        level,
        totalPresences: stats.total,
        presentCount: stats.present,
        presentPercentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
      }));

      const teacherStatsWithPercent = Object.entries(teacherStats).map(([teacherId, stats]) => ({
        teacherId: parseInt(teacherId),
        teacherName: stats.name,
        totalPresences: stats.total,
        presentCount: stats.present,
        presentPercentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
      }));

      res.json({
        levelStats: levelStatsWithPercent,
        teacherStats: teacherStatsWithPercent
      });
    } catch (err) {
      console.error("Get stats error:", err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ==================== RR ENDPOINTS ====================

  // Create RR (supports same-week vs evening recuperation)
  app.post('/admin/rr', verifyAdminToken, async (req, res) => {
    try {
      let { eleveId, originSeanceId, destinationSeanceId, notes, rrType, penalizeRR } = req.body;
      eleveId = parseInt(eleveId);
      originSeanceId = parseInt(originSeanceId);
      destinationSeanceId = parseInt(destinationSeanceId);
      rrType = rrType || 'same_week'; // same_week | evening_recuperation
      if (typeof penalizeRR === 'undefined' || rrType === 'same_week') {
        // same_week defaults to no penalty, evening_recuperation defaults true
        penalizeRR = rrType === 'evening_recuperation';
      }

      const now = new Date();
      const origin = await prisma.seance.findUnique({
        where: { id: originSeanceId },
        include: { classe: true }
      });
      const destination = await prisma.seance.findUnique({
        where: { id: destinationSeanceId },
        include: { classe: true }
      });
      if (!origin || !destination) return res.status(400).json({ error: 'Séances invalides' });

      // Basic time validations
      if (destination.dateHeure < now) {
        return res.status(400).json({ error: 'Séance de destination dans le passé' });
      }

      const sameLevel = origin.classe.level && destination.classe.level === origin.classe.level;
      const destLevelEmpty = !destination.classe.level || destination.classe.level.trim() === '';

      // Compute ISO week number helper
      function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      }
      const originWeek = getWeekNumber(new Date(origin.dateHeure));
      const destWeek = getWeekNumber(new Date(destination.dateHeure));

      if (rrType === 'same_week') {
        if (originWeek !== destWeek) {
          return res.status(400).json({ error: 'Destination pas dans la même semaine' });
        }
        // Must be same level or empty
        if (!sameLevel && !destLevelEmpty) {
          return res.status(400).json({ error: 'Niveau incompatible pour rattrapage même semaine' });
        }
        // No penalty for same-week always
        penalizeRR = false;
      } else if (rrType === 'evening_recuperation') {
        if (!destination.classe.isRecuperation) {
          return res.status(400).json({ error: 'Destination non marquée comme cours de récupération (soir)' });
        }
        if (!sameLevel && !destLevelEmpty) {
          return res.status(400).json({ error: 'Niveau incompatible pour récupération' });
        }
      } else {
        return res.status(400).json({ error: 'Type RR invalide' });
      }

      // Transaction: create RR, ensure presences, adjust eleve rrRestantes if needed, lock destination level if recuperation & empty
      const result = await prisma.$transaction(async (tx) => {
        await tx.presence.upsert({
          where: { seanceId_eleveId: { seanceId: originSeanceId, eleveId } },
          create: { seanceId: originSeanceId, eleveId, statut: 'awaiting' },
          update: { statut: 'awaiting' }
        });
        await tx.presence.upsert({
          where: { seanceId_eleveId: { seanceId: destinationSeanceId, eleveId } },
          create: { seanceId: destinationSeanceId, eleveId, statut: 'no_status' },
          update: { statut: 'no_status' }
        });

        if (rrType === 'evening_recuperation' && destLevelEmpty) {
          await tx.classe.update({
            where: { id: destination.classeId },
            data: { level: origin.classe.level }
          });
        }

        if (penalizeRR) {
          await tx.eleve.update({
            where: { id: eleveId },
            data: { rrRestantes: { decrement: 1 } }
          });
        }

        const rr = await tx.replacementRequest.create({
          data: {
            eleveId,
            originSeanceId,
            destinationSeanceId,
            notes: notes ? sanitizeInput(notes) : null,
            status: 'open',
            destStatut: 'no_status',
            rrType,
            penalizeRR
          }
        });
        return rr;
      });

      res.json({ message: 'RR created', rr: result });
    } catch (err) {
      console.error('Create RR error:', err);
      res.status(500).json({ error: 'Failed to create RR' });
    }
  });

  // List RRs
  app.get('/admin/rr', verifyAdminToken, async (req, res) => {
    try {
      const rrs = await prisma.replacementRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          eleve: true,
          originSeance: { include: { classe: true } },
          destinationSeance: { include: { classe: true } },
        }
      });
      res.json(rrs);
    } catch (err) {
      console.error('List RR error:', err);
      res.status(500).json({ error: 'Failed to list RRs' });
    }
  });

  // Get RR by id
  app.get('/admin/rr/:id', verifyAdminToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rr = await prisma.replacementRequest.findUnique({
        where: { id },
        include: {
          eleve: true,
          originSeance: { include: { classe: true } },
          destinationSeance: { include: { classe: true } },
        }
      });
      if (!rr) return res.status(404).json({ error: 'RR not found' });
      res.json(rr);
    } catch (err) {
      console.error('Get RR error:', err);
      res.status(500).json({ error: 'Failed to fetch RR' });
    }
  });

  // Cancel/Delete RR with reversal logic
  app.delete('/admin/rr/:id', verifyAdminToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rr = await prisma.replacementRequest.findUnique({
        where: { id },
        include: {
          eleve: true,
          originSeance: { include: { classe: true } },
          destinationSeance: { include: { classe: true } },
        }
      });
      if (!rr) return res.status(404).json({ error: 'RR not found' });
      if (rr.status === 'cancelled') return res.json({ message: 'Already cancelled', rr });

      const result = await prisma.$transaction(async (tx) => {
        // Reversal of rrRestantes if penalized
        if (rr.penalizeRR) {
          await tx.eleve.update({
            where: { id: rr.eleveId },
            data: { rrRestantes: { increment: 1 } }
          });
        }

        // Mark RR cancelled
        const cancelled = await tx.replacementRequest.update({
          where: { id: rr.id },
          data: { status: 'cancelled', destStatut: 'cancelled' }
        });

        // Optionally unlock level: if destination class level was previously empty and only set because of recuperation.
        // We do a heuristic: if rrType is evening_recuperation, destination class isRecuperation true, and there are NO other non-cancelled evening_recuperation RRs using this destination class whose origin class level differs, we leave as-is (keeping level). Unlocking automatically could be destructive; skipping for safety.
        // If true unlock desired, uncomment code below.
        // const otherRRs = await tx.replacementRequest.findMany({
        //   where: { destinationSeanceId: rr.destinationSeanceId, status: { not: 'cancelled' } }
        // });
        // if (rr.rrType === 'evening_recuperation' && otherRRs.length === 0) {
        //   await tx.classe.update({ where: { id: rr.destinationSeance.classeId }, data: { level: null } });
        // }

        // Remove destination presence if it exists (optional). We keep it to preserve history; if removal desired, uncomment:
        // await tx.presence.deleteMany({ where: { seanceId: rr.destinationSeanceId, eleveId: rr.eleveId } });

        return cancelled;
      });
      res.json({ message: 'RR cancelled', rr: result });
    } catch (err) {
      console.error('Delete RR error:', err);
      res.status(500).json({ error: 'Failed to cancel RR' });
    }
  });

  // Update RR (status/notes)
  app.put('/admin/rr/:id', verifyAdminToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, notes } = req.body;
      const rr = await prisma.replacementRequest.update({
        where: { id },
        data: {
          status: status ? sanitizeInput(status) : undefined,
          notes: notes ? sanitizeInput(notes) : undefined,
        }
      });
      res.json({ message: 'RR updated', rr });
    } catch (err) {
      console.error('Update RR error:', err);
      res.status(500).json({ error: 'Failed to update RR' });
    }
  });

  // ==================== PERMANENCE ENDPOINTS ====================

  // Ensure default 14 slots exist (Mon-Sun with AM/PM). Sunday=0..Saturday=6
  async function ensureDefaultPermanenceSlots(tx) {
    const existing = await tx.permanenceSlot.findMany();
    if (existing.length >= 14) return;
    const periods = ['AM', 'PM'];
    const toCreate = [];
    for (let d = 1; d <= 7; d++) { // use 1..7 then mod 7 to map Monday..Sunday
      const day = d % 7; // 1..6 -> 1..6, 7->0 (Sunday)
      for (const p of periods) {
        // skip if already exists
        const already = existing.find(e => e.dayOfWeek === day && e.period === p);
        if (!already) {
          toCreate.push({ dayOfWeek: day, period: p });
        }
      }
    }
    if (toCreate.length > 0) {
      await tx.permanenceSlot.createMany({ data: toCreate, skipDuplicates: true });
    }
  }

  // Get weekly permanence (always same fixed week)
  app.get('/permanence/week', authenticate, async (req, res) => {
    try {
      await ensureDefaultPermanenceSlots(prisma);
      const slots = await prisma.permanenceSlot.findMany({
        include: { user: { select: { id: true, nom: true, prenom: true, email: true } } },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
      });
      res.json(slots);
    } catch (err) {
      console.error('Get permanence week error:', err);
      res.status(500).json({ error: 'Failed to fetch permanence week' });
    }
  });

  // Initialize default slots (admin)
  app.post('/admin/permanence/initialize', verifyAdminToken, async (req, res) => {
    try {
      await ensureDefaultPermanenceSlots(prisma);
      const slots = await prisma.permanenceSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }] });
      res.json({ message: 'Permanence slots initialized', count: slots.length });
    } catch (err) {
      console.error('Initialize permanence error:', err);
      res.status(500).json({ error: 'Failed to initialize permanence slots' });
    }
  });

  // Assign/update a permanence slot (admin)
  app.put('/admin/permanence/slot', verifyAdminToken, async (req, res) => {
    try {
      let { dayOfWeek, period, userId, notes } = req.body;
      if (dayOfWeek === undefined || period === undefined) {
        return res.status(400).json({ error: 'dayOfWeek and period are required' });
      }
      dayOfWeek = parseInt(dayOfWeek);
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: 'dayOfWeek must be between 0 and 6' });
      }
      const normalizedPeriod = String(period).toUpperCase();
      if (!['AM', 'PM'].includes(normalizedPeriod)) {
        return res.status(400).json({ error: 'period must be AM or PM' });
      }
      if (notes) notes = sanitizeInput(notes);

      // Validate user if provided
      let connectUserId = null;
      if (userId !== undefined && userId !== null && userId !== '') {
        const parsed = parseInt(userId);
        if (isNaN(parsed)) {
          return res.status(400).json({ error: 'userId must be a number' });
        }
        const userExists = await prisma.user.findUnique({ where: { id: parsed } });
        if (!userExists) {
          return res.status(404).json({ error: 'User not found' });
        }
        connectUserId = parsed;
      }

      // Ensure slot exists
      await ensureDefaultPermanenceSlots(prisma);
      const slot = await prisma.permanenceSlot.upsert({
        where: { dayOfWeek_period: { dayOfWeek, period: normalizedPeriod } },
        update: { userId: connectUserId, notes: notes ?? null },
        create: { dayOfWeek, period: normalizedPeriod, userId: connectUserId, notes: notes ?? null }
      });

      const slotWithUser = await prisma.permanenceSlot.findUnique({
        where: { id: slot.id },
        include: { user: { select: { id: true, nom: true, prenom: true, email: true } } }
      });

      res.json({ message: 'Slot updated', slot: slotWithUser });
    } catch (err) {
      console.error('Update permanence slot error:', err);
      res.status(500).json({ error: 'Failed to update slot' });
    }
  });

  // ==================== ATTENDANCE CALENDAR ENDPOINTS ====================

  // Get all selected attendance days for a year
  app.get('/admin/attendance/calendar/:year', verifyAdminToken, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year) || year < 1970 || year > 9999) {
        return res.status(400).json({ error: 'Invalid year' });
      }
      const days = await prisma.attendanceDay.findMany({
        where: { year },
        orderBy: { date: 'asc' }
      });
      res.json(days.map(d => ({ id: d.id, date: d.date.toISOString().split('T')[0] })));
    } catch (err) {
      console.error('Get attendance calendar error:', err);
      res.status(500).json({ error: 'Failed to fetch attendance calendar' });
    }
  });

  // Toggle a day's selection (active=true to add, false to remove)
  app.put('/admin/attendance/calendar/toggle', verifyAdminToken, async (req, res) => {
    try {
      const { date, active } = req.body; // date as YYYY-MM-DD
      if (!date) return res.status(400).json({ error: 'date is required' });
      const iso = `${date}T00:00:00.000Z`;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date format' });
      const year = d.getUTCFullYear();

      if (active) {
        const created = await prisma.attendanceDay.upsert({
          where: { date: d },
          update: {},
          create: { date: d, year }
        });
        return res.json({ id: created.id, date });
      } else {
        // remove if exists
        await prisma.attendanceDay.deleteMany({ where: { date: d } });
        return res.json({ removed: true, date });
      }
    } catch (err) {
      console.error('Toggle attendance day error:', err);
      res.status(500).json({ error: 'Failed to toggle day' });
    }
  });

  // Reset all selected days for a year
  app.post('/admin/attendance/calendar/reset/:year', verifyAdminToken, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) return res.status(400).json({ error: 'Invalid year' });
      const del = await prisma.attendanceDay.deleteMany({ where: { year } });
      res.json({ message: 'Attendance calendar reset', count: del.count });
    } catch (err) {
      console.error('Reset attendance calendar error:', err);
      res.status(500).json({ error: 'Failed to reset calendar' });
    }
  });

  app.listen(4000, () => {
    console.log('Server ready at http://localhost:4000/graphql');
    console.log('REST API ready at http://localhost:4000');
    console.log('User management endpoints:');
    console.log('  POST /users/getSalt - Get user salt for login');
    console.log('  POST /users/login - User login');
    console.log('  POST /users/changePassword - Change password');
    console.log('  GET /users/profile - Get user profile');
    console.log('  PUT /users/profile - Update user profile');
    console.log('  POST /admin/users - Create user (admin only)');
    console.log('  GET /admin/users - Get all users (admin only)');
    console.log('  PUT /admin/users/:id - Update user (admin only)');
    console.log('  POST /admin/users/:id/resetPassword - Reset user password (admin only)');
    console.log('  PUT /admin/users/:id/activate - Activate user (admin only)');
    console.log('  PUT /admin/users/:id/deactivate - Deactivate user (admin only)');
    console.log('  GET /admin/eleves - Get all eleves (admin only)');
    console.log('  POST /admin/eleves - Create eleve (admin only)');
    console.log('  PUT /admin/eleves/:id - Update eleve (admin only)');
    console.log('  DELETE /admin/eleves/:id - Delete eleve (admin only)');
    console.log('Class management endpoints:');
    console.log('  GET /admin/classes - Get all classes (admin only)');
    console.log('  GET /admin/classes/:id - Get single class');
    console.log('  POST /admin/classes - Create class (admin only)');
    console.log('  PUT /admin/classes/:id - Update class (admin only)');
    console.log('  DELETE /admin/classes/:id - Delete class (admin only)');
    console.log('Seance management endpoints:');
    console.log('  GET /admin/classes/:id/seances - Get seances for class');
    console.log('  POST /admin/classes/:id/seances - Create seance (admin only)');
    console.log('  PUT /admin/seances/:id - Update seance (admin only)');
    console.log('  DELETE /admin/seances/:id - Delete seance (admin only)');
    console.log('  POST /admin/classes/:id/generate-seances - Generate seances from week numbers (admin only)');
    console.log('Settings management endpoints:');
    console.log('  GET /admin/settings - Get all settings grouped by category (admin only)');
    console.log('  GET /admin/settings/:category - Get settings for specific category');
    console.log('  POST /admin/settings - Create setting (admin only)');
    console.log('  PUT /admin/settings/:id - Update setting (admin only)');
    console.log('  DELETE /admin/settings/:id - Delete setting (admin only)');
    console.log('  POST /admin/settings/initialize - Initialize default settings (admin only)');
    console.log('Attendance management endpoints:');
    console.log('  GET /admin/attendance/week/:startDate - Get seances for a specific week');
    console.log('  GET /admin/seances/:id/attendance - Get attendance for a specific seance');
    console.log('  PUT /admin/attendance/:presenceId - Update attendance for a student');
    console.log('  PUT /admin/seances/:id/attendance - Bulk update attendance for a seance');
  });
}

startServer();