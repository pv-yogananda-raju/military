import express from 'express';
import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all tactical alerts (sorted by priority and read state)
// @route   GET /api/alerts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;

    // Fetch active & pending officers to calculate readBy / unreadBy details (including newly registered ones)
    let officersList = [];
    if (isDbOffline) {
      officersList = mockDb.officers.filter(o => o.status !== 'Suspended');
    } else {
      const Officer = mongoose.model('Officer');
      officersList = await Officer.find({ status: { $ne: 'Suspended' } });
    }

    const officersObj = officersList.map(o => ({
      officerId: o.officerId,
      fullName: o.fullName,
      rank: o.rank,
      role: o.role,
    }));

    let rawAlerts = [];
    if (isDbOffline) {
      rawAlerts = [...mockDb.alerts];
      // Filter out targeted alerts if not Admin Commander
      if (req.user.role !== 'Admin Commander') {
        rawAlerts = rawAlerts.filter(a => {
          const targets = a.targetedOfficers || [];
          return targets.length === 0 || targets.includes(req.user.officerId) || a.creatorId === req.user.officerId;
        });
      }
    } else {
      let query = {};
      if (req.user.role !== 'Admin Commander') {
        query = {
          $or: [
            { targetedOfficers: { $exists: true, $size: 0 } },
            { targetedOfficers: { $exists: false } },
            { targetedOfficers: req.user.officerId },
            { creatorId: req.user.officerId }
          ]
        };
      }
      rawAlerts = await Alert.find(query).sort({ createdAt: -1 }).limit(100);
    }

    // Process alerts dynamically per requesting user
    const processedAlerts = rawAlerts.map(alert => {
      const obj = typeof alert.toObject === 'function' ? alert.toObject() : { ...alert };
      const readByList = obj.readBy || [];
      const targetedList = obj.targetedOfficers || [];

      // If targetedList is not empty, only the targeted officers are relevant for readBy / unreadBy details
      let alertOfficers = officersObj;
      if (targetedList.length > 0) {
        alertOfficers = officersObj.filter(o => targetedList.includes(o.officerId));
      }
      
      obj.isRead = readByList.includes(req.user.officerId);
      obj.readByDetails = alertOfficers.filter(o => readByList.includes(o.officerId));
      obj.unreadByDetails = alertOfficers.filter(o => !readByList.includes(o.officerId));
      return obj;
    });

    // Sort: Unread first, then by priority/date
    processedAlerts.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, count: processedAlerts.length, alerts: processedAlerts });
  } catch (error) {
    console.error(`[GET Alerts Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access alerts pipeline.' });
  }
});

// @desc    Mark a specific alert as read
// @route   PUT /api/alerts/:alertId/read
// @access  Private
router.put('/:alertId/read', protect, async (req, res) => {
  try {
    const { alertId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const alert = mockDb.alerts.find(a => a.alertId === alertId);
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert code not found.' });
      }
      if (!alert.readBy) alert.readBy = [];
      if (!alert.readBy.includes(req.user.officerId)) {
        alert.readBy.push(req.user.officerId);
      }
      alert.isRead = true; // backward compatibility
      return res.json({ success: true, alert });
    }

    const alert = await Alert.findOne({ alertId });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert code not found.' });
    }

    if (!alert.readBy) alert.readBy = [];
    if (!alert.readBy.includes(req.user.officerId)) {
      alert.readBy.push(req.user.officerId);
    }
    alert.isRead = true; // backward compatibility
    await alert.save();

    res.json({ success: true, alert });
  } catch (error) {
    console.error(`[PUT Alert Read Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update alert state.' });
  }
});

// @desc    Mark all active alerts as read
// @route   PUT /api/alerts/read-all
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      mockDb.alerts.forEach(a => {
        if (!a.readBy) a.readBy = [];
        if (!a.readBy.includes(req.user.officerId)) {
          a.readBy.push(req.user.officerId);
        }
        a.isRead = true;
      });
      return res.json({ success: true, message: 'All active alarms marked as read.' });
    }

    await Alert.updateMany(
      { readBy: { $ne: req.user.officerId } },
      { $addToSet: { readBy: req.user.officerId }, $set: { isRead: true } }
    );
    res.json({ success: true, message: 'All active alarms marked as read.' });
  } catch (error) {
    console.error(`[PUT Alert ReadAll Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update alert array.' });
  }
});

// @desc    Manually raise a Tactical Alert
// @route   POST /api/alerts
// @access  Private (All registered officers can compile alerts and send to whoever they want)
router.post('/', protect, async (req, res) => {
  try {
    const { title, message, priority, linkedEntity, targetedOfficers } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and content description required.' });
    }

    const alertId = `ALT-${Math.floor(100000 + Math.random() * 900000)}`;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const targetsDesc = targetedOfficers && targetedOfficers.length > 0 ? `targeted to ${targetedOfficers.length} operatives` : 'broadcast globally';
    const action = `Manually raised level-${priority} Tactical Alert: [${alertId}] "${title}" (${targetsDesc}).`;

    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const newAlert = {
        alertId,
        title,
        message,
        priority: priority || 'Normal',
        linkedEntity: linkedEntity || 'None',
        isRead: false,
        readBy: [],
        creatorId: req.user.officerId,
        targetedOfficers: targetedOfficers || [],
        createdAt: new Date(),
      };
      mockDb.alerts.unshift(newAlert);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.status(201).json({ success: true, alert: newAlert });
    }

    const newAlert = await Alert.create({
      alertId,
      title,
      message,
      priority: priority || 'Normal',
      linkedEntity: linkedEntity || 'None',
      isRead: false,
      readBy: [],
      creatorId: req.user.officerId,
      targetedOfficers: targetedOfficers || [],
    });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, alert: newAlert });
  } catch (error) {
    console.error(`[POST Alert Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to broadcast manual alert.' });
  }
});

// @desc    Expunge alert record
// @route   DELETE /api/alerts/:alertId
// @access  Private (Admin Commander only)
router.delete('/:alertId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { alertId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const idx = mockDb.alerts.findIndex(a => a.alertId === alertId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Alert file not found.' });
      }
      const title = mockDb.alerts[idx].title;
      mockDb.alerts.splice(idx, 1);
      
      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: `Expunged tactical alert warning: [${alertId}] ("${title}"). (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Alert [${alertId}] cleared from records.` });
    }

    const alert = await Alert.findOne({ alertId });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert file not found.' });
    }

    await Alert.deleteOne({ alertId });

    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action: `Expunged tactical alert warning: [${alertId}] ("${alert.title}").`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Alert [${alertId}] cleared from records.` });
  } catch (error) {
    console.error(`[DELETE Alert Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge alert.' });
  }
});

export default router;
