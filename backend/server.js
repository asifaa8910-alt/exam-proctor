import express from 'express';
import cors from 'cors';
import { initDb } from './src/config/db.js';
import authRouter from './src/routes/auth.js';
import examsRouter from './src/routes/exams.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS
app.use(cors());

// Increase body limit to support base64 snapshots upload during exams
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/exams', examsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Initialize database and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
