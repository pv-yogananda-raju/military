import express from 'express';
import mongoose from 'mongoose';
import Mission from '../models/Mission.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all missions with status, priority, and text search
// @route   GET /api/missions
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, search, page, limit, sortBy, sortOrder } = req.query;
    const isDbOffline = mongoose.connection.readyState !== 1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    const sField = sortBy || 'createdAt';
    const sOrder = sortOrder === 'asc' ? 1 : -1;

    if (isDbOffline) {
      let filtered = [...mockDb.missions];

      if (status) filtered = filtered.filter(m => m.currentStatus === status);
      if (priority) filtered = filtered.filter(m => m.priority === priority);

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(m => 
          m.missionName.toLowerCase().includes(s) ||
          m.missionCode.toLowerCase().includes(s) ||
          m.objective.toLowerCase().includes(s) ||
          m.missionZone.toLowerCase().includes(s)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        let valA = a[sField] || '';
        let valB = b[sField] || '';
        if (typeof valA === 'string') {
          return sOrder * valA.localeCompare(valB);
        }
        return sOrder * (valA - valB);
      });

      const paginated = filtered.slice(skipNum, skipNum + limitNum);

      return res.json({ 
        success: true, 
        count: filtered.length, 
        page: pageNum, 
        totalPages: Math.ceil(filtered.length / limitNum), 
        missions: paginated 
      });
    }

    // Standard database call
    let query = {};
    if (status) query.currentStatus = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { missionName: { $regex: search, $options: 'i' } },
        { missionCode: { $regex: search, $options: 'i' } },
        { objective: { $regex: search, $options: 'i' } },
        { missionZone: { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await Mission.countDocuments(query);
    const missions = await Mission.find(query)
      .sort({ [sField]: sOrder })
      .skip(skipNum)
      .limit(limitNum);

    res.json({ 
      success: true, 
      count: totalCount, 
      page: pageNum, 
      totalPages: Math.ceil(totalCount / limitNum), 
      missions 
    });
  } catch (error) {
    console.error(`[GET Missions Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve mission files.' });
  }
});

// @desc    Get specific mission details
// @route   GET /api/missions/:missionCode
// @access  Private
router.get('/:missionCode', protect, async (req, res) => {
  try {
    const { missionCode } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const mission = mockDb.missions.find(m => m.missionCode === missionCode);
      if (!mission) {
        return res.status(404).json({ success: false, message: 'Mission code not found.' });
      }
      return res.json({ success: true, mission });
    }

    const mission = await Mission.findOne({ missionCode });
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission code not found.' });
    }
    res.json({ success: true, mission });
  } catch (error) {
    console.error(`[GET Mission Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access mission file.' });
  }
});

// @desc    Create new operational mission
// @route   POST /api/missions
// @access  Private (Admin Commander & Intelligence Officer only)
router.post('/', protect, authorize('Admin Commander', 'Intelligence Officer'), async (req, res) => {
  try {
    const { missionName, priority, objective, deadline, missionZone, assignedOfficers } = req.body;

    if (!missionName || !priority || !objective || !deadline || !missionZone) {
      return res.status(400).json({ success: false, message: 'Please provide all mandatory mission parameters.' });
    }

    const missionCode = `MSN-${Math.floor(100 + Math.random() * 900)}`;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Created new Mission objective: [${missionCode}] "${missionName}" (Priority: ${priority}).`;

    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const newMission = {
        missionCode,
        missionName,
        priority,
        objective,
        deadline: new Date(deadline),
        missionZone,
        assignedOfficers: assignedOfficers || [],
        currentStatus: 'Pending',
        progressPercentage: 0,
        missionLogs: [
          {
            timestamp: new Date(),
            log: `Mission initialized by ${req.user.rank} ${req.user.fullName}. Operational status: PENDING. (In-Memory)`,
            enteredBy: req.user.officerId,
          },
        ],
        createdAt: new Date(),
      };

      mockDb.missions.unshift(newMission);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Missions',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.status(201).json({ success: true, mission: newMission });
    }

    const newMission = await Mission.create({
      missionCode,
      missionName,
      priority,
      objective,
      deadline: new Date(deadline),
      missionZone,
      assignedOfficers: assignedOfficers || [],
      currentStatus: 'Pending',
      progressPercentage: 0,
      missionLogs: [
        {
          timestamp: new Date(),
          log: `Mission initialized by ${req.user.rank} ${req.user.fullName}. Operational status: PENDING.`,
          enteredBy: req.user.officerId,
        },
      ],
    });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Missions',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, mission: newMission });
  } catch (error) {
    console.error(`[POST Mission Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to initialize mission objective.' });
  }
});

// @desc    Update mission operational parameters
// @route   PUT /api/missions/:missionCode
// @access  Private
router.put('/:missionCode', protect, async (req, res) => {
  try {
    const { missionCode } = req.params;
    const { missionName, priority, objective, deadline, missionZone, currentStatus, progressPercentage, assignedOfficers } = req.body;

    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const mission = mockDb.missions.find(m => m.missionCode === missionCode);
      if (!mission) {
        return res.status(404).json({ success: false, message: 'Mission file not found.' });
      }

      const isField = req.user.role === 'Field Officer';
      const isCommander = req.user.role === 'Admin Commander' || req.user.role === 'Intelligence Officer';

      if (isField && (missionName || priority || deadline || assignedOfficers)) {
        return res.status(403).json({ success: false, message: 'Clearance Violation: Field Operatives can only update logs and status parameters.' });
      }

      let logMessage = '';
      if (currentStatus && currentStatus !== mission.currentStatus) {
        logMessage += `Status transition: ${mission.currentStatus.toUpperCase()} ➔ ${currentStatus.toUpperCase()}. `;
        mission.currentStatus = currentStatus;
      }

      if (progressPercentage !== undefined && progressPercentage !== mission.progressPercentage) {
        logMessage += `Progress adjustment: ${mission.progressPercentage}% ➔ ${progressPercentage}%. `;
        mission.progressPercentage = progressPercentage;
      }

      if (logMessage) {
        mission.missionLogs.push({
          timestamp: new Date(),
          log: logMessage + `Updated by: ${req.user.rank} ${req.user.fullName} (In-Memory)`,
          enteredBy: req.user.officerId,
        });
      }

      if (isCommander) {
        if (missionName) mission.missionName = missionName;
        if (priority) mission.priority = priority;
        if (objective) mission.objective = objective;
        if (deadline) mission.deadline = new Date(deadline);
        if (missionZone) mission.missionZone = missionZone;
        if (assignedOfficers) mission.assignedOfficers = assignedOfficers;
      }

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Missions',
        action: `Modified parameters on Mission [${missionCode}]: ${logMessage || 'Details updated.'} (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, mission });
    }

    const mission = await Mission.findOne({ missionCode });
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission file not found.' });
    }

    const isField = req.user.role === 'Field Officer';
    const isCommander = req.user.role === 'Admin Commander' || req.user.role === 'Intelligence Officer';

    if (isField && (missionName || priority || deadline || assignedOfficers)) {
      return res.status(403).json({ success: false, message: 'Clearance Violation: Field Operatives can only update logs and status parameters.' });
    }

    let logMessage = '';
    if (currentStatus && currentStatus !== mission.currentStatus) {
      logMessage += `Status transition: ${mission.currentStatus.toUpperCase()} ➔ ${currentStatus.toUpperCase()}. `;
      mission.currentStatus = currentStatus;
    }

    if (progressPercentage !== undefined && progressPercentage !== mission.progressPercentage) {
      logMessage += `Progress adjustment: ${mission.progressPercentage}% ➔ ${progressPercentage}%. `;
      mission.progressPercentage = progressPercentage;
    }

    if (logMessage) {
      mission.missionLogs.push({
        timestamp: new Date(),
        log: logMessage + `Updated by: ${req.user.rank} ${req.user.fullName}`,
        enteredBy: req.user.officerId,
      });
    }

    if (isCommander) {
      if (missionName) mission.missionName = missionName;
      if (priority) mission.priority = priority;
      if (objective) mission.objective = objective;
      if (deadline) mission.deadline = new Date(deadline);
      if (missionZone) mission.missionZone = missionZone;
      if (assignedOfficers) mission.assignedOfficers = assignedOfficers;
    }

    await mission.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Missions',
      action: `Modified parameters on Mission [${missionCode}]: ${logMessage || 'Details updated.'}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, mission });
  } catch (error) {
    console.error(`[PUT Mission Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update mission parameters.' });
  }
});

// @desc    Add manual report log to mission
// @route   POST /api/missions/:missionCode/logs
// @access  Private
router.post('/:missionCode/logs', protect, async (req, res) => {
  try {
    const { log } = req.body;
    if (!log) {
      return res.status(400).json({ success: false, message: 'Log content string is required.' });
    }

    const { missionCode } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const mission = mockDb.missions.find(m => m.missionCode === missionCode);
      if (!mission) {
        return res.status(404).json({ success: false, message: 'Mission code not found.' });
      }

      mission.missionLogs.push({
        timestamp: new Date(),
        log: log,
        enteredBy: `${req.user.rank} ${req.user.fullName} (${req.user.officerId}) (In-Memory)`,
      });

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Missions',
        action: `Appended manual operation log to Mission [${mission.missionCode}]. (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, missionLogs: mission.missionLogs });
    }

    const mission = await Mission.findOne({ missionCode });
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission code not found.' });
    }

    mission.missionLogs.push({
      timestamp: new Date(),
      log: log,
      enteredBy: `${req.user.rank} ${req.user.fullName} (${req.user.officerId})`,
    });

    await mission.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Missions',
      action: `Appended manual operation log to Mission [${mission.missionCode}].`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, missionLogs: mission.missionLogs });
  } catch (error) {
    console.error(`[POST Mission Log Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to append mission log.' });
  }
});

// @desc    Delete mission record
// @route   DELETE /api/missions/:missionCode
// @access  Private (Admin Commander only)
router.delete('/:missionCode', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { missionCode } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const idx = mockDb.missions.findIndex(m => m.missionCode === missionCode);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Mission file not found.' });
      }
      mockDb.missions.splice(idx, 1);

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Missions',
        action: `Permanently deleted Mission file [${missionCode}] from active servers. (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Mission [${missionCode}] expunged successfully.` });
    }

    const mission = await Mission.findOne({ missionCode });
    if (!mission) {
      return res.status(404).json({ success: false, message: 'Mission file not found.' });
    }

    await Mission.deleteOne({ missionCode });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Missions',
      action: `Permanently deleted Mission file [${missionCode}] from active servers.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Mission [${missionCode}] expunged successfully.` });
  } catch (error) {
    console.error(`[DELETE Mission Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge mission.' });
  }
});

export default router;
