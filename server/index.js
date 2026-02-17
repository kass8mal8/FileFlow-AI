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
app.use(cors()); // Allow all for development simplicity, or be more specific in production
app.use(express.json({ limit: '50mb' })); // Increased limit for attachments

// Routes
app.use('/api', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/user', require('./routes/userRoutes'));

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

