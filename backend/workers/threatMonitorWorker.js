import { parentPort, workerData } from 'worker_threads';
import mongoose from 'mongoose';
import IntelligenceReport from '../models/IntelligenceReport.js';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';

const mongoUri = workerData?.mongoUri || 'mongodb://localhost:27017/miscs';

const run = async () => {
  let currentDelay = 5000; // Start at 5s minimum delay
  
  try {
    await mongoose.connect(mongoUri);
    console.log(`[Thread-1: Threat Monitor] Concurrently connected to MongoDB.`);

    while (true) {
      let workDone = false;
      const criticalReports = await IntelligenceReport.find({ threatLevel: 'Critical' });

      for (const report of criticalReports) {
        const existingAlert = await Alert.findOne({ linkedEntity: report.reportId });

        if (!existingAlert) {
          const alertId = `ALT-${Math.floor(100000 + Math.random() * 900000)}`;
          
          await Alert.create({
            alertId,
            title: `CRITICAL THREAT: ${report.title.toUpperCase()}`,
            message: `Threat escalation flagged in region [${report.location}]. High operational hazard.`,
            priority: 'Critical',
            linkedEntity: report.reportId,
            isRead: false,
          });

          const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
          await AuditLog.create({
            logId,
            user: 'Background Threat System (Thread-1)',
            module: 'Concurrency',
            action: `Background thread auto-generated Critical Alert [${alertId}] for Report [${report.reportId}].`,
            deviceDetails: 'Server Monitor Worker',
          });

          console.log(`[Thread-1] Raised critical alert ${alertId} for report ${report.reportId}`);
          workDone = true;
        }
      }

      // Send telemetry packet back to main thread
      parentPort.postMessage({
        worker: 'Threat Monitor',
        status: 'Active',
        timestamp: new Date().toISOString(),
        monitoredCount: criticalReports.length,
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
    console.error(`[Thread-1 Error] ${error.message}`);
    parentPort.postMessage({ worker: 'Threat Monitor', error: error.message });
  }
};

run();
