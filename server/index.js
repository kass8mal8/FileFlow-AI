const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

require('dotenv').config();

// Connect to Database
connectDB();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'https://unpalatial-alfreda-trackable.ngrok-free.dev', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', aiRoutes);
app.use('/api/payments', paymentRoutes); // Register payment routes

app.get('/', (req, res) => {
  res.send('FileFlow AI Server Running');
});
// Health check (Inline for simplicity or can be moved to its own route)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

