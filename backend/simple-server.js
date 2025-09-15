const express = require('express');
const cors = require('cors');

const app = express();

// Set up CORS before any other middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is healthy' });
});

// Mock users endpoint for testing
app.get('/admin/users', (req, res) => {
  console.log('GET /admin/users requested');
  res.json([
    { 
      id: 1, 
      nom: 'Test', 
      prenom: 'User', 
      email: 'test@example.com',
      GSM: '123456789',
      titre: 'Dev',
      fonction: 'Developer',
      niveau: 2,
      admin: false,
      entreeFonction: new Date().toISOString(),
      revenuQ1: 5000,
      revenuQ2: 5500,
      mdpTemporaire: false
    }
  ]);
});

// Mock eleves endpoint for testing
app.get('/admin/eleves', (req, res) => {
  console.log('GET /admin/eleves requested');
  res.json([
    {
      id: 1,
      nom: 'Dupont',
      prenom: 'Jean',
      dateNaissance: '2010-05-15T00:00:00.000Z',
      nomCompletParent: 'Marie Dupont',
      mailResponsable1: 'marie.dupont@email.com',
      gsmResponsable1: '0123456789'
    }
  ]);
});

app.listen(4000, () => {
  console.log('✅ Simple server ready at http://localhost:4000');
  console.log('✅ Test endpoint: http://localhost:4000/admin/users');
});
