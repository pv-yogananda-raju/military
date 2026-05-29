import express from 'express';
import mongoose from 'mongoose';
import Suspect from '../models/Suspect.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all suspects with filtering, sorting and paging
// @route   GET /api/suspects
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;

    // Search and filter parameters
    const search = req.query.search || '';
    const threatLevel = req.query.threatLevel || '';
    const status = req.query.status || '';
    
    // Paging
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;

    // Sort parameters
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    if (isDbOffline) {
      // In-Memory mock search & filtering
      let results = [...mockDb.suspects];

      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          s => 
            s.fullName.toLowerCase().includes(q) || 
            s.alias.toLowerCase().includes(q) || 
            s.location.toLowerCase().includes(q)
        );
      }

      if (threatLevel) {
        results = results.filter(s => s.associatedThreatLevel === threatLevel);
      }

      if (status) {
        results = results.filter(s => s.status === status);
      }

      // Sort
      results.sort((a, b) => {
        let fieldA = a[sortBy] || '';
        let fieldB = b[sortBy] || '';

        if (sortBy === 'createdAt') {
          fieldA = new Date(fieldA);
          fieldB = new Date(fieldB);
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      const totalCount = results.length;
      const paginatedResults = results.slice(skip, skip + limit);

      return res.json({
        success: true,
        count: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        suspects: paginatedResults,
      });
    }

    // Standard Mongoose search pipeline
    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { alias: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    if (threatLevel) {
      query.associatedThreatLevel = threatLevel;
    }

    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalCount = await Suspect.countDocuments(query);
    const suspects = await Suspect.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
      suspects,
    });
  } catch (error) {
    console.error(`[GET Suspects Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access suspects registry.' });
  }
});

// @desc    Get a single suspect detail briefing
// @route   GET /api/suspects/:suspectId
// @access  Private
router.get('/:suspectId', protect, async (req, res) => {
  try {
    const { suspectId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const suspect = mockDb.suspects.find(s => s.suspectId === suspectId.toUpperCase());
      if (!suspect) {
        return res.status(404).json({ success: false, message: 'Suspect file code not found.' });
      }
      return res.json({ success: true, suspect });
    }

    const suspect = await Suspect.findOne({ suspectId: suspectId.toUpperCase() });
    if (!suspect) {
      return res.status(404).json({ success: false, message: 'Suspect file code not found.' });
    }

    res.json({ success: true, suspect });
  } catch (error) {
    console.error(`[GET Suspect Detail Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve suspect dossier.' });
  }
});

// @desc    Register a new rogue suspect profile
// @route   POST /api/suspects
// @access  Private (All authenticated officers allowed)
router.post('/', protect, async (req, res) => {
  try {
    const { fullName, alias, associatedThreatLevel, status, location, description, photoUrl } = req.body;

    if (!fullName || !location || !description) {
      return res.status(400).json({ success: false, message: 'Full name, location, and recon description are required.' });
    }

    const suspectId = `SUS-${Math.floor(100000 + Math.random() * 900000)}`;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Logged new suspect profile in tactical database: [${suspectId}] "${fullName}" (${alias || 'No Alias'}).`;

    const isDbOffline = mongoose.connection.readyState !== 1;

    const suspectData = {
      suspectId,
      fullName,
      alias: alias || 'Unknown',
      associatedThreatLevel: associatedThreatLevel || 'Low',
      status: status || 'Wanted',
      location,
      description,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      linkedReports: [],
      linkedMissions: [],
    };

    if (isDbOffline) {
      mockDb.suspects.unshift(suspectData);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: action + ' (In-Memory Fallback)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.status(201).json({ success: true, suspect: suspectData });
    }

    const suspect = await Suspect.create(suspectData);

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, suspect });
  } catch (error) {
    console.error(`[POST Suspect Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to compile suspect record.' });
  }
});

// @desc    Expunge suspect profile from records
// @route   DELETE /api/suspects/:suspectId
// @access  Private (Admin Commander only)
router.delete('/:suspectId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { suspectId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const idx = mockDb.suspects.findIndex(s => s.suspectId === suspectId.toUpperCase());
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Suspect dossier not found.' });
      }
      const name = mockDb.suspects[idx].fullName;
      mockDb.suspects.splice(idx, 1);

      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: `Expunged suspect dossier: [${suspectId}] "${name}". (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Suspect dossier [${suspectId}] permanently purged.` });
    }

    const suspect = await Suspect.findOne({ suspectId: suspectId.toUpperCase() });
    if (!suspect) {
      return res.status(404).json({ success: false, message: 'Suspect dossier not found.' });
    }

    await Suspect.deleteOne({ suspectId: suspectId.toUpperCase() });

    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action: `Expunged suspect dossier: [${suspectId}] "${suspect.fullName}".`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Suspect dossier [${suspectId}] permanently purged.` });
  } catch (error) {
    console.error(`[DELETE Suspect Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge suspect dossier.' });
  }
});

// @desc    Update suspect details
// @route   PUT /api/suspects/:suspectId
// @access  Private (Admin Commander only)
router.put('/:suspectId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { suspectId } = req.params;
    const { fullName, alias, associatedThreatLevel, status, location, description, photoUrl } = req.body;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Updated suspect dossier details: [${suspectId}] "${fullName}".`;

    if (isDbOffline) {
      const suspect = mockDb.suspects.find(s => s.suspectId === suspectId.toUpperCase());
      if (!suspect) {
        return res.status(404).json({ success: false, message: 'Suspect dossier not found.' });
      }

      if (fullName) suspect.fullName = fullName;
      if (alias) suspect.alias = alias;
      if (associatedThreatLevel) suspect.associatedThreatLevel = associatedThreatLevel;
      if (status) suspect.status = status;
      if (location) suspect.location = location;
      if (description) suspect.description = description;
      if (photoUrl) suspect.photoUrl = photoUrl;

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, suspect });
    }

    const suspect = await Suspect.findOne({ suspectId: suspectId.toUpperCase() });
    if (!suspect) {
      return res.status(404).json({ success: false, message: 'Suspect dossier not found.' });
    }

    if (fullName) suspect.fullName = fullName;
    if (alias) suspect.alias = alias;
    if (associatedThreatLevel) suspect.associatedThreatLevel = associatedThreatLevel;
    if (status) suspect.status = status;
    if (location) suspect.location = location;
    if (description) suspect.description = description;
    if (photoUrl) suspect.photoUrl = photoUrl;

    await suspect.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, suspect });
  } catch (error) {
    console.error(`[PUT Suspect Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update suspect record.' });
  }
});

export default router;
