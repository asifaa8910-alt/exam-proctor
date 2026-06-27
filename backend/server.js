import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './src/config/db.js';
import authRouter from './src/routes/auth.js';
import examsRouter from './src/routes/exams.js';
import proctorRouter from './src/routes/proctor.js';
import { initSocket } from './src/services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Initialize Socket Service
initSocket(io);

const PORT = process.env.PORT || 5002;

// Enable CORS
app.use(cors());

// Increase body limit to support base64 snapshots upload during exams
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve snapshot uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to attach socket server to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/exams', examsRouter);
app.use('/api/proctor', proctorRouter);
app.use('/proctor', proctorRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Initialize database and start server
initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
