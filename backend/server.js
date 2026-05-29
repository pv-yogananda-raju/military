import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

import mongoose from 'mongoose';
import connectDB from './config/db.js';

// Route files
import authRoutes from './routes/auth.js';
import officerRoutes from './routes/officers.js';
import reportRoutes from './routes/reports.js';
import missionRoutes from './routes/missions.js';
import evidenceRoutes from './routes/evidence.js';
import alertRoutes from './routes/alerts.js';
import logRoutes from './routes/logs.js';
import suspectRoutes from './routes/suspects.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import fs from 'fs';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Restrict CORS origins for security lockdown in production hosting environments
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS Rejection: Operational Security Denied Access.'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Set up directory variables for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure static public uploads directory exists
const publicUploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

// Serve public static folder
app.use('/public', express.static(path.join(__dirname, 'public')));

// Bind API Routes
app.use('/api/auth', authRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/suspects', suspectRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

// Global worker telemetry registry for real-time thread monitoring
const workerTelemetry = {};

// Telemetry endpoint for background concurrency worker threads
app.get('/api/logs/workers', (req, res) => {
  res.json({
    success: true,
    workers: Object.values(workerTelemetry)
  });
});

// Base Route
app.get('/', (req, res) => {
  res.json({
    message: 'Military Intelligence & Surveillance Coordination System (MISCS) - API Gateway Online.',
    version: '1.0.0',
    concurrency_status: 'Thread Workers Spawned Successfully',
  });
});

// Spawn Worker Threads (Concurrency Layer)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/miscs';

const startWorker = (workerFile, workerName) => {
  try {
    const workerPath = path.resolve(__dirname, 'workers', workerFile);
    const worker = new Worker(workerPath, {
      workerData: { mongoUri: MONGO_URI },
    });

    workerTelemetry[workerName] = {
      workerName,
      status: 'Spawning',
      lastSeen: new Date().toISOString(),
      monitoredCount: 0,
      currentDelayMs: 5000,
    };

    worker.on('message', (msg) => {
      workerTelemetry[workerName] = {
        workerName,
        status: msg.status || 'Active',
        lastSeen: msg.timestamp || new Date().toISOString(),
        monitoredCount: msg.monitoredCount ?? msg.processedCount ?? msg.expiredCount ?? 0,
        currentDelayMs: msg.currentDelayMs ?? 5000,
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CONCURRENCY][Thread - ${workerName}]:`, msg);
      }
    });

    worker.on('error', (err) => {
      workerTelemetry[workerName].status = `Error: ${err.message}`;
      console.error(`[CONCURRENCY_ERROR][Thread - ${workerName}]:`, err.message);
    });

    worker.on('exit', (code) => {
      workerTelemetry[workerName].status = `Exited (Code ${code})`;
      console.log(`[CONCURRENCY_EXIT][Thread - ${workerName}]: Spun down with code: ${code}`);
      if (code !== 0) {
        console.warn(`[CONCURRENCY_RECOVERY][Thread - ${workerName}]: Restarting thread context in 5s...`);
        setTimeout(() => startWorker(workerFile, workerName), 5000);
      }
    });

    console.log(`[+] Spawned background thread: ${workerName}`);
    return worker;
  } catch (error) {
    console.error(`[!] Concurrency Spawning Failed for [${workerName}]:`, error.message);
  }
};

// Initialize Background Workers
const startBackgroundWorkers = () => {
  console.log(`[*] Spawning background military intelligence threads...`);
  startWorker('threatMonitorWorker.js', 'Threat Monitor (1)');
  startWorker('evidenceProcessorWorker.js', 'Evidence Hashing (2)');
  startWorker('missionTrackerWorker.js', 'Mission Deadlines (3)');
  startWorker('simulationWorker.js', 'Officer Simulator (4)');
  console.log(`[+] Concurrency threads fully initialized.`);
};

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`[*] MISCS API Server listening on port ${PORT}`);
  console.log(`======================================================\n`);
  
  // Launch workers once connection is ready
  if (mongoose.connection.readyState === 1) {
    startBackgroundWorkers();
  } else {
    mongoose.connection.once('connected', () => {
      startBackgroundWorkers();
    });
  }
});
