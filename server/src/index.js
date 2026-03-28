require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { registerJobs } = require('./jobs');

const app = express();

// Respect proxy headers (Render/NGINX) so rate-limit & auth get real client IPs
app.set('trust proxy', 1);

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting for API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per 15 mins
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// STANDARD MIDDLEWARE
// =============================================================================
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'https://desklite.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://7sr93st1-3000.inc1.devtunnels.ms',
      'https://7sr93st1-3001.inc1.devtunnels.ms',
      'https://7sr93st1-5001.inc1.devtunnels.ms',
      'capacitor://localhost',
      'http://10.0.2.2:3000'

    ];
    if (!origin) return callback(null, true);
    if (allowed.includes(origin) || origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Only use morgan in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// =============================================================================
// DATABASE CONNECTION with retry logic
// =============================================================================
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (err) {
      console.error(`MongoDB connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('❌ Failed to connect to MongoDB after all retries');
  process.exit(1);
};

// =============================================================================
// ROUTES
// =============================================================================
// Apply rate limiting (relaxed in non-production)
if (process.env.RATE_LIMIT_DISABLE !== 'true') {
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api', apiLimiter);
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/ledger', require('./routes/ledger'));
app.use('/api/summary', require('./routes/summary'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/customer-details', require('./routes/customerDetails'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/push', require('./routes/push'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/inventory', require('./routes/inventory'));

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  res.status(dbState === 1 ? 200 : 503).json({ 
    status: dbState === 1 ? 'healthy' : 'unhealthy',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================
app.use((err, req, res, next) => {
  // Log error but don't expose internal details
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ 
    error: statusCode === 500 ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// SERVER STARTUP
// =============================================================================
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer(port, attempts = 0) {
  // Connect to database first
  await connectWithRetry();
  
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port} (${process.env.NODE_ENV || 'development'})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts < 5) {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, trying ${nextPort}...`);
      setTimeout(() => startServer(nextPort, attempts + 1), 200);
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });

  // Set server timeouts
  server.timeout = 30000; // 30 seconds
  server.keepAliveTimeout = 65000; // slightly higher than typical ALB idle timeout
}

startServer(DEFAULT_PORT);
registerJobs();