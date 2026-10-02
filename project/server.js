import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// ============================================================
// PHASE 1 SECURITY FIX: JWT_SECRET must be set in .env
// Old behaviour preserved as comment below.
// ---- OLD (vulnerable): process.env.JWT_SECRET || 'fallback-secret'
// This allowed the server to run with a publicly-known secret if
// .env was missing, making all JWTs forgeable.
// ---- NEW: fail fast if JWT_SECRET is not set
// ============================================================
if (!process.env.JWT_SECRET) {
  console.error(
    '❌ FATAL: JWT_SECRET environment variable is not set.\n' +
    '   Add JWT_SECRET=<strong-random-value> to your .env file and restart.'
  );
  process.exit(1);
}

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);
const INFERENCE_SERVER_URL = 'http://localhost:8000';

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/cura-app'
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'CURA-X API Server is running!' });
});

// Proxy health check to Python inference server
app.get('/api/inference/health', async (req, res) => {
  try {
    const response = await axios.get(`${INFERENCE_SERVER_URL}/health`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: 'Inference server is not available',
      error: error.message
    });
  }
});

// ============================================================
// PHASE 1: Chat endpoint
// Changes from original:
//   1. Added JWT auth check before forwarding to Python
//   2. Fixed proxy path: /chat → /ai/chat  (was broken before)
//   3. Reduced timeout: 90 000ms → 15 000ms (Groq is fast)
//   4. Added history[] forwarding for memory support
// Old broken proxy preserved as comment:
//   ---- OLD: axios.post(`${INFERENCE_SERVER_URL}/chat`, ...)
//   ---- NEW: axios.post(`${INFERENCE_SERVER_URL}/ai/chat`, ...)
// ============================================================
app.post('/api/chat', async (req, res) => {
  // Auth gate — reject unauthenticated requests
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const jwt = await import('jsonwebtoken');
    jwt.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { message, language = 'EN', memory = true, history = [] } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    console.log(`📤 Forwarding to Groq via Python: "${message.substring(0, 60)}..."`);

    const response = await axios.post(
      `${INFERENCE_SERVER_URL}/ai/chat`,   // FIXED: was /chat (wrong path)
      { message, language, memory, history },
      {
        timeout: 15000,                     // FIXED: was 90000ms
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('✅ Groq response received');
    res.json(response.data);

  } catch (error) {
    console.error('❌ Chat API error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AI service unavailable. Make sure the Python inference server is running on port 8000.'
      });
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request timed out. Please try again.'
      });
    }

    const detail = error.response?.data?.detail || error.response?.data?.error || error.message;
    res.status(500).json({
      error: 'Failed to process message',
      details: detail
    });
  }
});

// User and chat routes
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chats.js';

app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 CURA-X Node backend running on http://localhost:${port}`);
    console.log(`📡 AI chat proxying to: ${INFERENCE_SERVER_URL}/ai/chat`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use. Retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
};

startServer(DEFAULT_PORT);
