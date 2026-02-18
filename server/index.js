const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const googleRoutes = require('./routes/googleRoutes');

require('dotenv').config();

// Connect to Database
connectDB();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: '*', // For production, replace with specific domains
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'ngrok-skip-browser-warning'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increased limit for attachments

// Routes
app.use('/api', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/todos', require('./routes/todoRoutes'));

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

