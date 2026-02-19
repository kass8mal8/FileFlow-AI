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
app.set('trust proxy', 1);
const port = process.env.PORT || API_PORT;
const isProduction = process.env.NODE_ENV === 'production';

// 1. CORS Middleware (Must be very early)
const allowedOrigins = isProduction 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:19000'];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'ngrok-skip-browser-warning'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 2. Basic Security Headers
app.use(helmet());

// 3. Performance: Compression
app.use(compression());

// 4. Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// 5. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiter to all api routes
app.use('/api/', limiter);

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

