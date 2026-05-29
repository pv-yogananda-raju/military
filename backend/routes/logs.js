import express from 'express';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Mission from '../models/Mission.js';
import IntelligenceReport from '../models/IntelligenceReport.js';
import Officer from '../models/Officer.js';
import Session from '../models/Session.js';
import Evidence from '../models/Evidence.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get system audit logs with filters and pagination
// @route   GET /api/logs
// @access  Private (Admin Commander & Intel Officer only)
router.get('/', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { module, search, limit } = req.query;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const maxLimit = parseInt(limit, 10) || 50;

    if (isDbOffline) {
      // In-Memory search
      let filteredLogs = [...mockDb.auditLogs];

      if (module) {
        filteredLogs = filteredLogs.filter(l => l.module === module);
      }

      if (search) {
        const s = search.toLowerCase();
        filteredLogs = filteredLogs.filter(l => 
          l.user.toLowerCase().includes(s) || 
          l.action.toLowerCase().includes(s) || 
          l.logId.toLowerCase().includes(s)
        );
      }

      return res.json({ success: true, count: filteredLogs.length, logs: filteredLogs.slice(0, maxLimit) });
    }

    // Standard database call
    let query = {};
    if (module) {
      query.module = module;
    }

    if (search) {
      query.$or = [
        { user: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { logId: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(maxLimit);

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error(`[GET AuditLogs Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access system audit registries.' });
  }
});

// @desc    Retrieve combined dashboard statistics using MongoDB Aggregation Pipelines
// @route   GET /api/logs/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      // Return beautiful pre-aggregated mock counts!
      const stats = mockDb.getDashboardStats();
      return res.json(stats);
    }

    // Standard database aggregation pipelines
    const missionStats = await Mission.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const reportStats = await IntelligenceReport.aggregate([
      {
        $group: {
          _id: '$threatLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    const officerStats = await Officer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const auditStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Monthly intelligence trends aggregation pipeline
    const monthlyTrends = await IntelligenceReport.aggregate([
      {
        $match: {
          createdAt: { $exists: true, $type: 'date' }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 6. Officer activity transaction volumes aggregation pipeline
    const officerActivity = await AuditLog.aggregate([
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    const totalMissions = await Mission.countDocuments({});
    const totalReports = await IntelligenceReport.countDocuments({});
    const totalOfficers = await Officer.countDocuments({});
    const totalEvidence = await Evidence.countDocuments({});
    const activeSessions = await Session.countDocuments({ status: 'Active' });

    res.json({
      success: true,
      counts: {
        missions: totalMissions,
        reports: totalReports,
        officers: totalOfficers,
        evidence: totalEvidence,
        activeSessions,
      },
      aggregates: {
        missions: missionStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        reports: reportStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        officers: officerStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        auditModules: auditStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        monthlyTrends: monthlyTrends.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          count: item.count
        })),
        officerActivity: officerActivity.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error(`[GET Dashboard Stats Aggregation Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'MongoDB stats aggregation pipeline failed.' });
  }
});

export default router;
