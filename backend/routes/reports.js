import express from 'express';
import mongoose from 'mongoose';
import IntelligenceReport from '../models/IntelligenceReport.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all intelligence reports with multi-field search and threat filters
// @route   GET /api/reports
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, threatLevel, status, officer, page, limit, sortBy, sortOrder } = req.query;
    const isDbOffline = mongoose.connection.readyState !== 1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    const sField = sortBy || 'createdAt';
    const sOrder = sortOrder === 'asc' ? 1 : -1;

    if (isDbOffline) {
      let filtered = [...mockDb.reports];

      if (threatLevel) filtered = filtered.filter(r => r.threatLevel === threatLevel);
      if (status) filtered = filtered.filter(r => r.status === status);
      if (officer) filtered = filtered.filter(r => r.assignedOfficer === officer);

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(r => 
          r.title.toLowerCase().includes(s) ||
          r.reportId.toLowerCase().includes(s) ||
          r.location.toLowerCase().includes(s) ||
          r.suspectDetails.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s)
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
        reports: paginated 
      });
    }

    // Standard database call
    let query = {};
    if (threatLevel) query.threatLevel = threatLevel;
    if (status) query.status = status;
    if (officer) query.assignedOfficer = officer;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { reportId: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { suspectDetails: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await IntelligenceReport.countDocuments(query);
    const reports = await IntelligenceReport.find(query)
      .sort({ [sField]: sOrder })
      .skip(skipNum)
      .limit(limitNum);

    res.json({ 
      success: true, 
      count: totalCount, 
      page: pageNum, 
      totalPages: Math.ceil(totalCount / limitNum), 
      reports 
    });
  } catch (error) {
    console.error(`[GET Reports Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch intelligence reports archive.' });
  }
});

// @desc    Get specific intelligence report
// @route   GET /api/reports/:reportId
// @access  Private
router.get('/:reportId', protect, async (req, res) => {
  try {
    const { reportId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const report = mockDb.reports.find(r => r.reportId === reportId);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Intelligence report not found.' });
      }
      return res.json({ success: true, report });
    }

    const report = await IntelligenceReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Intelligence report not found.' });
    }
    res.json({ success: true, report });
  } catch (error) {
    console.error(`[GET Report Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve report data.' });
  }
});

// @desc    Create new intelligence report
// @route   POST /api/reports
// @access  Private (Admins, Intel Officers, Surveillance Analysts)
router.post('/', protect, authorize('Admin Commander', 'Intelligence Officer', 'Surveillance Analyst', 'Field Officer'), async (req, res) => {
  try {
    const { title, description, threatLevel, suspectDetails, location, evidence, attachments, notes } = req.body;

    if (!title || !description || !threatLevel || !location) {
      return res.status(400).json({ success: false, message: 'Please provide all mandatory fields.' });
    }

    const reportId = `REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Created new Intel Report [${reportId}] on: "${title}" (Threat Level: ${threatLevel}).`;

    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const newReport = {
        reportId,
        title,
        description,
        threatLevel,
        assignedOfficer: req.user.officerId,
        suspectDetails: suspectDetails || 'None declared.',
        location,
        evidence: evidence || [],
        attachments: attachments || [],
        notes: notes || '',
        status: 'Submitted',
        createdAt: new Date(),
      };

      mockDb.reports.unshift(newReport);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Intelligence',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      // Thread simulation: if threatLevel is Critical, simulate Thread-1 raising an alert after 1 second!
      if (threatLevel === 'Critical') {
        setTimeout(() => {
          const alertId = `ALT-${Math.floor(100000 + Math.random() * 900000)}`;
          const aLogId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
          mockDb.alerts.unshift({
            alertId,
            title: `CRITICAL THREAT: ${title.toUpperCase()}`,
            message: `Threat escalation flagged in region [${location}]. High operational hazard.`,
            priority: 'Critical',
            linkedEntity: reportId,
            isRead: false,
            createdAt: new Date(),
          });
          mockDb.auditLogs.unshift({
            logId: aLogId,
            user: 'Background Threat System (Thread-1)',
            module: 'Concurrency',
            action: `Background thread auto-generated Critical Alert [${alertId}] for Report [${reportId}]. (Mock-Thread)`,
            deviceDetails: 'Server Monitor Worker',
            ipAddress: '127.0.0.1',
            createdAt: new Date(),
          });
        }, 1000);
      }

      return res.status(201).json({ success: true, report: newReport });
    }

    const newReport = await IntelligenceReport.create({
      reportId,
      title,
      description,
      threatLevel,
      assignedOfficer: req.user.officerId,
      suspectDetails: suspectDetails || 'None declared.',
      location,
      evidence: evidence || [],
      attachments: attachments || [],
      notes: notes || '',
      status: 'Submitted',
    });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Intelligence',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    console.error(`[POST Report Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to publish intelligence report.' });
  }
});

// @desc    Update intelligence report
// @route   PUT /api/reports/:reportId
// @access  Private
router.put('/:reportId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { title, description, threatLevel, suspectDetails, location, evidence, attachments, notes, status, assignedOfficer } = req.body;

    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const report = mockDb.reports.find(r => r.reportId === reportId);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Intelligence report not found.' });
      }

      if (title) report.title = title;
      if (description) report.description = description;
      if (threatLevel) report.threatLevel = threatLevel;
      if (suspectDetails) report.suspectDetails = suspectDetails;
      if (location) report.location = location;
      if (evidence) report.evidence = evidence;
      if (attachments) report.attachments = attachments;
      if (notes) report.notes = notes;
      if (status) report.status = status;
      if (assignedOfficer) report.assignedOfficer = assignedOfficer;

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Intelligence',
        action: `Modified Intel Report [${reportId}] details and statuses. (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, report });
    }

    const report = await IntelligenceReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Intelligence report not found.' });
    }

    if (title) report.title = title;
    if (description) report.description = description;
    if (threatLevel) report.threatLevel = threatLevel;
    if (suspectDetails) report.suspectDetails = suspectDetails;
    if (location) report.location = location;
    if (evidence) report.evidence = evidence;
    if (attachments) report.attachments = attachments;
    if (notes) report.notes = notes;
    if (status) report.status = status;
    if (assignedOfficer) report.assignedOfficer = assignedOfficer;

    await report.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Intelligence',
      action: `Modified Intel Report [${reportId}] details and statuses.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, report });
  } catch (error) {
    console.error(`[PUT Report Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update report record.' });
  }
});

// @desc    Delete intelligence report
// @route   DELETE /api/reports/:reportId
// @access  Private (Admin Commander only)
router.delete('/:reportId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { reportId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const idx = mockDb.reports.findIndex(r => r.reportId === reportId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Intelligence report not found.' });
      }
      mockDb.reports.splice(idx, 1);

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Intelligence',
        action: `Permanently deleted Intel Report [${reportId}] from archives. (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Intelligence report [${reportId}] permanently expunged.` });
    }

    const report = await IntelligenceReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Intelligence report not found.' });
    }

    await IntelligenceReport.deleteOne({ reportId });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Intelligence',
      action: `Permanently deleted Intel Report [${reportId}] from archives.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Intelligence report [${reportId}] permanently expunged.` });
  } catch (error) {
    console.error(`[DELETE Report Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge report.' });
  }
});

export default router;
