import { parentPort, workerData } from 'worker_threads';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Officer from '../models/Officer.js';

const mongoUri = workerData?.mongoUri || 'mongodb://localhost:27017/miscs';

const simulatedActions = [
  {
    user: 'Lt. John McTavish (OFF-102)',
    module: 'Intelligence',
    action: 'Simulated concurrent database search for suspect: "Victor Zakhaev". Sector 7.',
    deviceDetails: 'Field Tactical Comm',
  },
  {
    user: 'Sgt. Gary Sanderson (OFF-104)',
    module: 'Officers',
    action: 'Simulated concurrent GPS ping update. Location: Coordinates [34.0522, -118.2437]. Status: IN FIELD.',
    deviceDetails: 'Mobile Satellite Transceiver',
  },
  {
    user: 'Col. Shepard (OFF-101)',
    module: 'Missions',
    action: 'Simulated concurrent read of Mission [MSN-501] objectives and progress parameters.',
    deviceDetails: 'Command Tactical Panel',
  },
  {
    user: 'Intel Analyst Price (OFF-103)',
    module: 'Evidence',
    action: 'Simulated concurrent file access: Downloaded secure Audio Log [EVI-3091]. Cryptographic signature verified.',
    deviceDetails: 'Signals Analyst Terminal',
  },
  {
    user: 'SysOper Ghost (OFF-105)',
    module: 'System',
    action: 'Simulated concurrent audit log diagnostic and thread health verification scan.',
    deviceDetails: 'Mainframes Diagnostic Panel',
  },
];

const run = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log(`[Thread-4: Simulation Engine] Concurrently connected to MongoDB.`);

    while (true) {
      // Pick a random simulated action
      const actionItem = simulatedActions[Math.floor(Math.random() * simulatedActions.length)];
      
      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Write log to DB
      await AuditLog.create({
        logId,
        user: actionItem.user,
        module: 'Concurrency',
        action: actionItem.action,
        deviceDetails: actionItem.deviceDetails,
        ipAddress: `192.168.${Math.floor(1 + Math.random() * 254)}.${Math.floor(1 + Math.random() * 254)}`,
      });

      // Silence standard loop console spams to maintain clean logs. Only pass messages to parent
      parentPort.postMessage({
        worker: 'Simulator',
        status: 'Active',
        timestamp: new Date().toISOString(),
        actionLogged: actionItem.user,
      });

      // Execute simulation every 15 seconds
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  } catch (error) {
    console.error(`[Thread-4 Error] ${error.message}`);
    parentPort.postMessage({ worker: 'Simulator', error: error.message });
  }
};

run();
