const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import configurations
const prisma = require('./config/database');
const { createLogger } = require('./config/logger');
const { initMinioClient } = require('./config/minio');
const redisClient = require('./config/redis');

// Import middleware
const { corsOptions, corsMiddleware } = require('./middleware/cors');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const eleveRoutes = require('./routes/eleves');
const classRoutes = require('./routes/classes');
const seanceRoutes = require('./routes/seances');
const attendanceRoutes = require('./routes/attendance');
const permanenceRoutes = require('./routes/permanence');
const statsRoutes = require('./routes/stats');
const rrRoutes = require('./routes/rr');
const settingsRoutes = require('./routes/settings');
const driveRoutes = require('./routes/drive');
const emailRoutes = require('./routes/email');

// GraphQL schema (minimal for now)
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

async function createApp() {
  console.log('🚀 Starting server...');

  // Ensure log directories
  const logBase = path.join(__dirname, '..', 'logs');
  const backendLogDir = path.join(logBase, 'backend');
  const frontendLogDir = path.join(logBase, 'frontend');
  [logBase, backendLogDir, frontendLogDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

  // Initialize logger
  const backendLogger = createLogger(logBase, backendLogDir);

  // Initialize MinIO
  const { minioClient } = await initMinioClient(require('./utils/helpers').withRetry);

  const app = express();

  // Use body parser and CORS before registering any routes (important for /graphql)
  app.use(express.json());
  app.use(require('cors')(corsOptions));
  app.use(corsMiddleware);

  // Initialize Apollo Server
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  // Register GraphQL endpoint after CORS and body parser
  app.use('/graphql', express.json(), expressMiddleware(server));

  // ==================== HEALTH CHECK ENDPOINT ====================
  app.get('/', (req, res) => {
    res.json({ message: 'Backend server is running', timestamp: new Date().toISOString() });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is healthy' });
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

  app.post('/admin/logs/frontend', require('./middleware/auth').verifyAdminToken, async (req, res) => {
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

  // ==================== ROUTE REGISTRATION ====================

  // Auth routes
  app.use('/users', authRoutes);
  app.use('/users/profile', profileRoutes);

  // Admin user management
  app.use('/admin/users', userRoutes);

  // Eleve management
  app.use('/admin/eleves', eleveRoutes);

  // Class management
  app.use('/admin/classes', classRoutes);

  // Seance management
  app.use('/admin/seances', seanceRoutes);

  // Attendance management
  app.use('/admin/attendance', attendanceRoutes);

  // Permanence management
  app.use('/permanence', permanenceRoutes);

  // Statistics
  app.use('/admin/stats', statsRoutes);

  // Replacement requests
  app.use('/admin/rr', rrRoutes);

  // Settings management
  app.use('/admin/settings', settingsRoutes);

  // Drive (file) management
  app.use('/admin/drive', driveRoutes);

  // Email sending
  app.use('/admin/email', emailRoutes);

  return app;
}

module.exports = createApp;