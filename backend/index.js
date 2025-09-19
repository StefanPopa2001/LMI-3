const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const multer = require('multer');
const { Client: MinioClient } = require('minio');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { Client } = require('node-mailjet');
const mailjet = new Client({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE
});

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
  // Ensure log directories
  const logBase = path.join(__dirname, '..', 'logs');
  const backendLogDir = path.join(logBase, 'backend');
  const frontendLogDir = path.join(logBase, 'frontend');
  [logBase, backendLogDir, frontendLogDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

  const backendLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
      new winston.transports.File({ filename: path.join(backendLogDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(backendLogDir, 'general.log') })
    ]
  });
  if (process.env.NODE_ENV !== 'production') {
    backendLogger.add(new winston.transports.Console({ format: winston.format.simple() }));
  }

  // Wrap console.* to also log
  const origConsoleError = console.error;
  console.error = (...args) => { backendLogger.error(args.map(a=> (a instanceof Error ? a.stack : a)).join(' ')); origConsoleError(...args); };
  const origConsoleLog = console.log;
  console.log = (...args) => { backendLogger.info(args.join(' ')); origConsoleLog(...args); };
  
  const app = express();

  // Use body parser and CORS before registering any routes (important for /graphql)
  // Echo the request origin when credentials are allowed to avoid Access-Control-Allow-Origin: '*'
  app.use(express.json());
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://frontend:3000',
    'http://0.0.0.0:3000'
  ];
  const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o=>o.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...extraOrigins]));

  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true); // non-browser or same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false
  }));

  // Additional CORS debugging and manual preflight handling
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
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

  // ==================== MINIO (DRIVE) INITIALIZATION ====================
  const MINIO_ENDPOINT_RAW = process.env.MINIO_ENDPOINT || 'minio';
  const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
  const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'admin';
  const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'adminadmin';
  const MINIO_USE_SSL = false;
  const DRIVE_BUCKET = process.env.DRIVE_BUCKET || 'drive';

  let MINIO_ENDPOINT = MINIO_ENDPOINT_RAW;
  let minioClient;
  async function initMinio(endpoint) {
    return new MinioClient({
      endPoint: endpoint,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY
    });
  }
  try {
    minioClient = await initMinio(MINIO_ENDPOINT_RAW);
    // quick ping (bucketExists on a dummy name just to resolve DNS)
    await withRetry(()=>minioClient.listBuckets());
    console.log(`MinIO primary endpoint OK: ${MINIO_ENDPOINT_RAW}`);
  } catch (e) {
    if (['EAI_AGAIN','ENOTFOUND'].includes(e.code)) {
      console.warn(`MinIO DNS resolution failed for '${MINIO_ENDPOINT_RAW}', falling back to localhost`);
      MINIO_ENDPOINT = 'localhost';
      minioClient = await initMinio(MINIO_ENDPOINT);
    } else {
      console.warn('MinIO initial connection issue:', e.message);
      minioClient = await initMinio(MINIO_ENDPOINT_RAW); // still keep original
    }
  }

  // Generic retry helper for transient errors (DNS EAI_AGAIN, networking)
  async function withRetry(fn, { retries = 3, delayMs = 300 } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try { return await fn(); } catch (e) {
        lastErr = e;
        const code = e && (e.code || e.errno);
        // Retry only transient network/dns errors
        if (!['EAI_AGAIN','ECONNRESET','ENOTFOUND','ETIMEDOUT'].includes(code) || attempt === retries) {
          throw e;
        }
        await new Promise(r=>setTimeout(r, delayMs * (attempt + 1))); // simple backoff
      }
    }
    throw lastErr;
  }

  // Ensure bucket exists
  try {
    const exists = await withRetry(()=>minioClient.bucketExists(DRIVE_BUCKET).catch(()=>false));
    if (!exists) {
      await withRetry(()=>minioClient.makeBucket(DRIVE_BUCKET, 'eu-west-1'));
      console.log(`Created MinIO bucket '${DRIVE_BUCKET}'`);
    }
  } catch (e) {
    console.warn('MinIO bucket init error (after retries):', e.message);
  }

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  // ==================== DRIVE (FILE) ENDPOINTS ====================
  // Utility helpers for drive features
  function normalizePrefix(prefixRaw) {
    if (!prefixRaw) return '';
    let p = prefixRaw.trim();
    if (p.startsWith('/')) p = p.slice(1);
    if (p === '/') return '';
    if (p && !p.endsWith('/')) p += '/';
    return p;
  }

  function inferTextLike(ext) {
    return [
      'txt','md','json','log','js','ts','jsx','tsx','css','scss','html','xml','yml','yaml','csv'
    ].includes(String(ext || '').toLowerCase());
  }

  // List files & folders at a given prefix ("virtual directory")
  app.get('/admin/drive', verifyAdminToken, async (req, res) => {
    const prefix = normalizePrefix(req.query.prefix || '');
    const diagnostics = req.query.diagnostics === '1';
    try {
      await withRetry(()=>new Promise((resolve, reject) => {
        const rawObjects = [];
        const stream = minioClient.listObjectsV2(DRIVE_BUCKET, prefix, true);
        stream.on('data', obj => { if (obj && obj.name) rawObjects.push(obj); });
        stream.on('error', err => reject(err));
        stream.on('end', () => {
          const seenFolders = new Set();
          const files = [];
          for (const o of rawObjects) {
            const remainder = o.name.substring(prefix.length);
            // Treat explicit zero-byte marker objects (ending with '/') as folders so empty folders show up
            if (remainder.endsWith('/') && o.size === 0) {
              const markerFolder = remainder.slice(0, -1); // drop trailing '/'
              if (markerFolder && !seenFolders.has(markerFolder)) seenFolders.add(markerFolder);
              continue; // don't process further as file
            }
            if (remainder.includes('/')) {
              const folderName = remainder.split('/')[0];
              if (folderName && !seenFolders.has(folderName)) seenFolders.add(folderName);
            } else if (remainder) {
              files.push({
                name: remainder,
                path: prefix + remainder,
                size: o.size,
                lastModified: o.lastModified
              });
            }
          }
          const payload = {
            prefix,
            folders: Array.from(seenFolders).sort(),
            files
          };
          if (diagnostics) {
            payload._diag = {
              objectCount: rawObjects.length,
              bucket: DRIVE_BUCKET,
              prefix,
              folderCount: payload.folders.length
            }; // lightweight diag
          }
          res.json(payload);
          resolve();
        });
      }));
    } catch (err) {
      console.error('Drive listing failed', err);
      const code = err.code || err.errno || 'UNKNOWN';
      let suggestion;
      if (code === 'ECONNREFUSED') {
        suggestion = `Connection refused to MinIO at ${MINIO_ENDPOINT}:${MINIO_PORT}. Ensure MinIO is running (docker compose up -d minio) and port ${MINIO_PORT} is published. If running backend outside Docker, MINIO_ENDPOINT should generally be 'localhost'.`;
      } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        suggestion = `DNS resolution failed for MinIO host '${MINIO_ENDPOINT}'. If backend runs outside Docker, set MINIO_ENDPOINT=localhost. Inside docker-compose, it should match the service name 'minio'.`;
      }
      res.status(500).json({ error: 'Drive listing failed', code, message: err.message, bucket: DRIVE_BUCKET, prefix, suggestion });
    }
  });

  // ==================== FRONTEND LOG INGESTION ====================
  const frontendLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
      new winston.transports.File({ filename: path.join(frontendLogDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(frontendLogDir, 'general.log') })
    ]
  });
  app.post('/admin/logs/frontend', verifyAdminToken, async (req, res) => {
    try {
      const { level = 'info', message, meta } = req.body || {};
      if (!message) return res.status(400).json({ error: 'Missing message' });
      if (level === 'error') frontendLogger.error({ message, meta }); else frontendLogger.info({ message, meta });
      res.json({ status: 'ok' });
    } catch (e) {
      backendLogger.error('Frontend log ingest failed ' + e.message);
      res.status(500).json({ error: 'Failed to log' });
    }
  });

  // Upload file (optionally to a prefix / folder path)
  app.post('/admin/drive/upload', verifyAdminToken, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const rawPath = req.body.path || req.query.path || '';
      const prefix = normalizePrefix(rawPath);
      const objectName = prefix + req.file.originalname;
      await withRetry(()=>minioClient.putObject(
          DRIVE_BUCKET,
          objectName,
          req.file.buffer,
          req.file.size,
          { 'Content-Type': req.file.mimetype }
        ));
      res.json({ message: 'Uploaded', name: req.file.originalname, path: objectName });
    } catch (err) {
      console.error('Upload error', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Create folder (stores a zero-byte object ending with '/')
  app.post('/admin/drive/folder', verifyAdminToken, async (req, res) => {
    try {
      const { path = '', name } = req.body || {};
      if (!name || /[\\]/.test(name) || name.includes('/')) return res.status(400).json({ error: 'Invalid folder name' });
      const prefix = normalizePrefix(path) + name + '/';
      // zero byte marker object
      await withRetry(()=>minioClient.putObject(DRIVE_BUCKET, prefix, Buffer.from(''), 0));
      res.json({ message: 'Folder created', prefix });
    } catch (err) {
      console.error('Create folder error', err);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  // Delete folder recursively
  app.delete('/admin/drive/folder', verifyAdminToken, async (req, res) => {
    const rawPrefix = req.query.prefix || req.body?.prefix;
    if (!rawPrefix) return res.status(400).json({ error: 'Missing prefix' });
    const prefix = normalizePrefix(rawPrefix);
    try {
      const toDelete = [];
      const stream = minioClient.listObjectsV2(DRIVE_BUCKET, prefix, true);
      stream.on('data', obj => { if (obj && obj.name) toDelete.push(obj.name); });
      stream.on('end', async () => {
        if (toDelete.length === 0) return res.json({ message: 'Nothing to delete', deleted: 0 });
        // MinIO removeObjects expects stream or array of objects {name}
        const objects = toDelete.map(n => ({ name: n }));
        try {
          await withRetry(()=>new Promise((resolve, reject) => {
              minioClient.removeObjects(DRIVE_BUCKET, objects, function(errs) {
                if (errs && errs.length) return reject(errs[0]);
                resolve();
              });
            })
          );
          res.json({ message: 'Folder deleted', deleted: toDelete.length });
        } catch (e) {
          console.error('Recursive delete error', e);
          res.status(500).json({ error: 'Failed to delete folder' });
        }
      });
      stream.on('error', err => {
        console.error('List for delete error', err);
        res.status(500).json({ error: 'Failed to enumerate folder' });
      });
    } catch (err) {
      console.error('Delete folder error', err);
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  });

  // Get presigned download URL
  app.get('/admin/drive/download/:name', verifyAdminToken, async (req, res) => {
    try {
      const { name } = req.params;
      const url = await withRetry(()=>minioClient.presignedGetObject(DRIVE_BUCKET, name, 60 * 60)); // 1h
      res.json({ url });
    } catch (err) {
      console.error('Download URL error', err);
      res.status(500).json({ error: 'Failed to get download URL' });
    }
  });

  // File preview endpoint
  // Query param: key (object key), optional textLimit (bytes)
  app.get('/admin/drive/preview', verifyAdminToken, async (req, res) => {
    const key = req.query.key;
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'Missing key' });
    const ext = key.split('.').pop();
    try {
      if (inferTextLike(ext)) {
        const limit = Math.min(parseInt(req.query.textLimit || '200000'), 500000); // safeguard
        const objStream = await withRetry(()=>minioClient.getObject(DRIVE_BUCKET, key));
        const chunks = [];
        let total = 0;
        await new Promise((resolve, reject) => {
          objStream.on('data', d => {
            total += d.length;
            if (total <= limit) chunks.push(d);
            if (total > limit) objStream.destroy();
          });
          objStream.on('end', resolve);
          objStream.on('error', reject);
        });
        const content = Buffer.concat(chunks).toString('utf8');
        return res.json({ type: 'text', truncated: total > limit, content });
      }
      // For non-text we just return a presigned URL so the frontend can stream it (image/pdf/etc)
      const url = await withRetry(()=>minioClient.presignedGetObject(DRIVE_BUCKET, key, 60 * 15)); // 15 min
      res.json({ type: 'binary', url });
    } catch (err) {
      console.error('Preview error', err);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // Simple storage health endpoint (admin only) to diagnose connectivity
  app.get('/admin/drive/health', verifyAdminToken, async (req, res) => {
    try {
      const exists = await withRetry(()=>minioClient.bucketExists(DRIVE_BUCKET));
      if (!exists) return res.status(500).json({ status: 'error', bucket: DRIVE_BUCKET, message: 'Bucket missing' });
      // Attempt a tiny list (limit by early destroy)
      let firstObject = null; let count = 0;
      await withRetry(()=>new Promise((resolve, reject) => {
        const stream = minioClient.listObjectsV2(DRIVE_BUCKET, '', true);
        stream.on('data', obj => {
          if (!firstObject && obj && obj.name) firstObject = { name: obj.name, size: obj.size };
          if (++count >= 5) stream.destroy();
        });
        stream.on('error', reject);
        stream.on('end', resolve);
        stream.on('close', resolve);
      }));
      res.json({ status: 'ok', bucket: DRIVE_BUCKET, sample: firstObject, scanned: count });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message, code: e.code || e.errno });
    }
  });

  // Delete file
  app.delete('/admin/drive/:name', verifyAdminToken, async (req, res) => {
    try {
      const { name } = req.params;
      await minioClient.removeObject(DRIVE_BUCKET, name);
      res.json({ message: 'Deleted' });
    } catch (err) {
      console.error('Delete error', err);
      res.status(500).json({ error: 'Failed to delete file' });
    }
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
      codeitbryan,
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
    codeitbryan = sanitizeEmail(codeitbryan);
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
          codeitbryan,
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
          codeitbryan: true,
          GSM: true,
          admin: true,
          actif: true,
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
    if (updateData.codeitbryan) updateData.codeitbryan = sanitizeEmail(updateData.codeitbryan);
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
          codeitbryan: true,
          GSM: true,
          admin: true,
          actif: true,
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

  // Get detailed eleve info including related seances & attendance
  app.get('/admin/eleves/:id/details', authenticate, requireAdmin, async (req, res) => {
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

  // ==================== ATTENDANCE MANAGEMENT ENDPOINTS ====================

  // Get seances for a specific week
  app.get("/admin/attendance/week/:startDate", verifyAdminToken, async (req, res) => {
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
  app.get("/admin/seances/:id/attendance", verifyAdminToken, async (req, res) => {
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
  app.put("/admin/attendance/:presenceId", verifyAdminToken, async (req, res) => {
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
  app.put("/admin/seances/:id/attendance", verifyAdminToken, async (req, res) => {
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
  app.get("/admin/attendance/calendar/:year", verifyAdminToken, async (req, res) => {
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

  // ==================== PERMANENCE MANAGEMENT ENDPOINTS ====================

  // Get weekly permanence schedule
  app.get("/permanence/week", authenticate, async (req, res) => {
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
  app.put("/admin/permanence/slot", verifyAdminToken, async (req, res) => {
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

  // ==================== STATISTICS ENDPOINTS ====================

  // Get admin statistics
  app.get("/admin/stats", verifyAdminToken, async (req, res) => {
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

  // ==================== REPLACEMENT REQUEST (RR) MANAGEMENT ENDPOINTS ====================

  // Get all replacement requests
  app.get("/admin/rr", verifyAdminToken, async (req, res) => {
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
  app.post("/admin/rr", verifyAdminToken, async (req, res) => {
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
  app.get("/admin/rr/:id", verifyAdminToken, async (req, res) => {
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
  app.put("/admin/rr/:id", verifyAdminToken, async (req, res) => {
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
  app.delete("/admin/rr/:id", verifyAdminToken, async (req, res) => {
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

  // ==================== EMAIL SENDING (ADMIN) ====================
  app.post('/admin/email/test', verifyAdminToken, async (req, res) => {
    const { to, subject, text, html } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, (text or html)' });
    }
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      return res.status(500).json({ error: 'Mailjet API keys not configured' });
    }
    try {
      const fromMatch = (process.env.MAIL_FROM || 'no-reply@example.com').match(/^(.+?)\s*<(.+)>$/);
      const fromName = fromMatch ? fromMatch[1].trim() : 'LMI App';
      const fromEmail = fromMatch ? fromMatch[2] : process.env.MAIL_FROM || 'no-reply@example.com';

      const request = mailjet
        .post("send", {'version': 'v3.1'})
        .request({
          "Messages":[
            {
              "From": {
                "Email": fromEmail,
                "Name": fromName
              },
              "To": [
                {
                  "Email": to,
                  "Name": to // or extract name if available
                }
              ],
              "Subject": subject,
              "TextPart": text || undefined,
              "HTMLPart": html || undefined
            }
          ]
        });

      const result = await request;
      res.json({ message: 'Email sent via Mailjet', id: result.body.Messages[0]?.To[0]?.MessageID || 'unknown' });
    } catch (e) {
      console.error('Email send error', e);
      res.status(500).json({ error: 'Failed to send email', details: e.message });
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
    console.log('  GET /admin/attendance/calendar/:year - Get calendar view for a year');
    console.log('  GET /admin/seances/:id/attendance - Get attendance for a specific seance');
    console.log('  PUT /admin/attendance/:presenceId - Update attendance for a student');
    console.log('  PUT /admin/seances/:id/attendance - Bulk update attendance for a seance');
    console.log('Permanence management endpoints:');
    console.log('  GET /permanence/week - Get weekly permanence schedule');
    console.log('  PUT /admin/permanence/slot - Update permanence slot (admin only)');
    console.log('Statistics endpoints:');
    console.log('  GET /admin/stats - Get admin statistics');
    console.log('Replacement request (RR) endpoints:');
    console.log('  GET /admin/rr - Get all replacement requests');
    console.log('  POST /admin/rr - Create replacement request');
    console.log('  GET /admin/rr/:id - Get single replacement request');
    console.log('  PUT /admin/rr/:id - Update replacement request');
    console.log('  DELETE /admin/rr/:id - Delete replacement request');
    console.log('Email sending endpoint:');
    console.log('  POST /admin/email/test - Send a test email');
  });
}

startServer();