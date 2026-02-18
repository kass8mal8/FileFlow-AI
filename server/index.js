const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const googleRoutes = require('./routes/googleRoutes');
const { API_PORT } = process.env

require('dotenv').config();

// Connect to Database
connectDB();

const app = express();
const port = process.env.PORT || API_PORT;
const isProduction = process.env.NODE_ENV === 'production';

// Basic Security Headers
app.use(helmet());

// Performance: Compression
app.use(compression());

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiter to all routes
app.use('/api/', limiter);

// Middleware
const corsOptions = {
  origin: isProduction 
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false)
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'ngrok-skip-browser-warning'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/todos', require('./routes/todoRoutes'));

app.get('/', (req, res) => {
  res.send('FileFlow AI Server Running');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const status = err.status || 500;
  const message = isProduction ? 'Internal Server Error' : err.message;
  
  res.status(status).json({
    error: {
      message: message,
      status: status
    }
  });
});

app.listen(port, () => {
  console.log(`Server running in ${isProduction ? 'production' : 'development'} mode on port ${port}`);
});

