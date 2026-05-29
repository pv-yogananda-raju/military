import { parentPort, workerData } from 'worker_threads';
import mongoose from 'mongoose';
import Mission from '../models/Mission.js';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';

const mongoUri = workerData?.mongoUri || 'mongodb://localhost:27017/miscs';

const run = async () => {
  let currentDelay = 5000; // Start at 5s minimum delay

  try {
    await mongoose.connect(mongoUri);
    console.log(`[Thread-3: Mission Tracker] Concurrently connected to MongoDB.`);

    while (true) {
      let workDone = false;
      const now = new Date();
      // Scans missions that are active but past deadline
      const activeMissions = await Mission.find({
        currentStatus: { $in: ['Pending', 'Active', 'Under Surveillance'] },
        deadline: { $lt: now },
      });

      for (const mission of activeMissions) {
        const existingAlert = await Alert.findOne({ linkedEntity: mission.missionCode });

        if (!existingAlert) {
          mission.missionLogs.push({
            timestamp: now,
            log: `[THREAD-3 EXPIRED TIMEOUT]: Operational deadline passed at ${mission.deadline.toLocaleString()}. Alert flagged.`,
            enteredBy: 'Auto Tracker (Thread-3)',
          });
          
          await mission.save();

          const alertId = `ALT-${Math.floor(100000 + Math.random() * 900000)}`;
          await Alert.create({
            alertId,
            title: `DEADLINE ESCALATION: ${mission.missionName.toUpperCase()}`,
            message: `Mission [${mission.missionCode}] deadline expired in [${mission.missionZone}]. Critical tracking active.`,
            priority: 'Important',
            linkedEntity: mission.missionCode,
            isRead: false,
          });

          const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
          await AuditLog.create({
            logId,
            user: 'Mission tracking monitor (Thread-3)',
            module: 'Concurrency',
            action: `Concurrently flagged overdue mission [${mission.missionCode}] and raised level-2 status warning alerts.`,
            deviceDetails: 'Operation Clock Engine',
          });

          console.log(`[Thread-3] Overdue alert issued for mission: ${mission.missionCode}`);
          workDone = true;
        }
      }

      parentPort.postMessage({
        worker: 'Mission Tracker',
        status: 'Active',
        timestamp: new Date().toISOString(),
        expiredCount: activeMissions.length,
        currentDelayMs: currentDelay,
      });

      // Exponential Backoff algorithm
      if (workDone) {
        currentDelay = 5000; // Reset to minimum delay on active work
      } else {
        currentDelay = Math.min(currentDelay + 5000, 30000); // Scale up to 30s when idle
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  } catch (error) {
    console.error(`[Thread-3 Error] ${error.message}`);
    parentPort.postMessage({ worker: 'Mission Tracker', error: error.message });
  }
};

run();
