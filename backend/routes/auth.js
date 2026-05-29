import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Officer from '../models/Officer.js';
import Session from '../models/Session.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Authenticate officer & generate token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { officerId, password } = req.body;

    if (!officerId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both Officer ID and password.' });
    }

    const isDbOffline = mongoose.connection.readyState !== 1;

    let officer = null;

    if (isDbOffline) {
      // FAULT-TOLERANT FALLBACK MODE: Fetch from in-memory DB
      officer = mockDb.officers.find(o => o.officerId === officerId.toUpperCase());
    } else {
      // STANDARD DB MODE
      officer = await Officer.findOne({ officerId: officerId.toUpperCase() });
    }

    if (!officer) {
      // Log failed login
      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      const action = `Failed authentication attempt: Officer ID [${officerId}] not registered in database.`;
      
      if (isDbOffline) {
        mockDb.auditLogs.unshift({ logId, user: `Unknown (${officerId})`, module: 'Authentication', action, ipAddress: req.ip || '127.0.0.1', createdAt: new Date() });
      } else {
        await AuditLog.create({ logId, user: `Unknown (${officerId})`, module: 'Authentication', action, ipAddress: req.ip });
      }

      return res.status(401).json({ success: false, message: 'Clearance Rejected: Invalid credentials.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, officer.passwordHash);
    if (!isMatch) {
      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      const action = `Failed password login challenge.`;

      if (isDbOffline) {
        mockDb.auditLogs.unshift({ logId, user: `${officer.fullName} (${officer.officerId})`, module: 'Authentication', action, ipAddress: req.ip || '127.0.0.1', createdAt: new Date() });
      } else {
        await AuditLog.create({ logId, user: `${officer.fullName} (${officer.officerId})`, module: 'Authentication', action, ipAddress: req.ip });
      }

      return res.status(401).json({ success: false, message: 'Clearance Rejected: Invalid credentials.' });
    }

    // Enforce operational status check
    if (officer.status === 'Pending Approval') {
      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      const action = `Login attempt rejected: operative profile is pending commander activation.`;

      if (isDbOffline) {
        mockDb.auditLogs.unshift({ logId, user: `${officer.fullName} (${officer.officerId})`, module: 'Authentication', action, ipAddress: req.ip || '127.0.0.1', createdAt: new Date() });
      } else {
        await AuditLog.create({ logId, user: `${officer.fullName} (${officer.officerId})`, module: 'Authentication', action, ipAddress: req.ip });
      }

      return res.status(403).json({ success: false, message: 'Access Blocked: Your enlistment profile is pending Admin Commander activation.' });
    }

    if (officer.status === 'Suspended') {
      const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
      const action = `Login attempt rejected: operative profile is suspended.`;

      if (isDbOffline) {
        mockDb.auditLogs.unshift({ logId, user: `${officer.fullName} (${officer.officerId})`, module: 'Authentication', action, ipAddress: req.ip || '127.0.0.1', createdAt: new Date() });
      } else {
        await AuditLog.create({ logId, user: `${officer.fullName} (${officer.officerId})`, module: 'Authentication', action, ipAddress: req.ip });
      }

      return res.status(403).json({ success: false, message: 'Access Blocked: Your operative profile has been suspended.' });
    }

    const sessionId = `SES-${Math.floor(100000 + Math.random() * 900000)}`;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Officer session established. Clearance level ${officer.clearanceLevel} verified. (FAULT-TOLERANT MOCK ACTIVE)`;

    if (isDbOffline) {
      officer.lastLogin = new Date();
      mockDb.sessions.push({
        sessionId,
        officerId: officer.officerId,
        status: 'Active',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Console',
        createdAt: new Date(),
      });
      mockDb.auditLogs.unshift({
        logId,
        user: `${officer.fullName} (${officer.officerId})`,
        module: 'Authentication',
        action,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });
    } else {
      officer.lastLogin = new Date();
      await officer.save();

      await Session.create({
        sessionId,
        officerId: officer.officerId,
        status: 'Active',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Console',
      });

      await AuditLog.create({
        logId,
        user: `${officer.fullName} (${officer.officerId})`,
        module: 'Authentication',
        action: `Officer session established. Clearance level ${officer.clearanceLevel} verified.`,
        ipAddress: req.ip || '127.0.0.1',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { officerId: officer.officerId, role: officer.role },
      process.env.JWT_SECRET || 'TACTICAL_MILITARY_SECRET_KEY_2026',
      { expiresIn: '8h' }
    );

    const officerResponse = typeof officer.toObject === 'function' ? officer.toObject() : { ...officer };
    delete officerResponse.passwordHash;

    res.json({
      success: true,
      token,
      officer: officerResponse,
    });
  } catch (error) {
    console.error(`[Login Route Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal Tactical Server Error.' });
  }
});

// @desc    Register a new officer & log in immediately
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { officerId, fullName, rank, role, department, clearanceLevel, email, phone, password } = req.body;

    if (!officerId || !fullName || !rank || !department || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const uOfficerId = officerId.toUpperCase();
    const isDbOffline = mongoose.connection.readyState !== 1;

    // Check existing
    if (isDbOffline) {
      const existing = mockDb.officers.find(o => o.officerId === uOfficerId);
      if (existing) {
        return res.status(400).json({ success: false, message: `Registration Conflict: Officer ID [${officerId}] is already registered.` });
      }
    } else {
      const existingOfficer = await Officer.findOne({ officerId: uOfficerId });
      if (existingOfficer) {
        return res.status(400).json({ success: false, message: `Registration Conflict: Officer ID [${officerId}] is already registered.` });
      }
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Profile image default
    const profileImage = 'https://images.unsplash.com/photo-1579567724489-2fed7c8f9de6?auto=format&fit=crop&q=80&w=200';

    let officer = {
      officerId: uOfficerId,
      fullName,
      rank,
      role: role || 'Field Officer',
      department,
      clearanceLevel: clearanceLevel || 'Level 1',
      contactDetails: { email, phone },
      passwordHash,
      plainPassword: password,
      status: 'Pending Approval',
      profileImage,
      dob: '1988-06-15',
      bloodGroup: 'O+',
      branchUnit: 'Cyber warfare division',
      enlistmentDate: '2010-08-20',
      cardIssueDate: '2025-01-01',
      cardExpirationDate: '2035-01-01',
      issuingAuthority: 'SECURED COMMAND SYSTEM',
      identificationMarks: 'None declared.',
      createdAt: new Date(),
    };

    if (isDbOffline) {
      mockDb.officers.unshift(officer);
    } else {
      const created = await Officer.create(officer);
      officer = created.toObject();
    }

    // Terminate session creation on registration to prevent auto-login!
    // Simply write an audit log entry for the enlistment application
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Enlistment request submitted for new operative profile: ${officer.fullName} (${officer.officerId}). Pending commander approval.`;

    if (isDbOffline) {
      mockDb.auditLogs.unshift({
        logId,
        user: `System Gate`,
        module: 'Authentication',
        action: action + ' (FAULT-TOLERANT MOCK)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });
    } else {
      await AuditLog.create({
        logId,
        user: `System Gate`,
        module: 'Authentication',
        action,
        ipAddress: req.ip || '127.0.0.1',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Enlistment request submitted successfully. Operational profile is pending Admin Commander activation.',
      officer: {
        officerId: officer.officerId,
        fullName: officer.fullName,
        rank: officer.rank,
        role: officer.role,
        department: officer.department,
        clearanceLevel: officer.clearanceLevel,
        contactDetails: officer.contactDetails,
        status: officer.status,
        profileImage: officer.profileImage,
      },
    });
  } catch (error) {
    console.error(`[Register Route Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to self-register operative.' });
  }
});

// @desc    Logout officer & terminate session
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Session terminated. Officer logged out gracefully.`;

    if (isDbOffline) {
      mockDb.sessions = mockDb.sessions.filter(s => s.officerId !== req.user.officerId);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Authentication',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });
    } else {
      await Session.updateMany(
        { officerId: req.user.officerId, status: 'Active' },
        { $set: { status: 'Terminated' } }
      );

      await AuditLog.create({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Authentication',
        action,
        ipAddress: req.ip || '127.0.0.1',
      });
    }

    res.json({ success: true, message: 'Secure session terminated successfully.' });
  } catch (error) {
    console.error(`[Logout Route Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
});

// @desc    Get active logged-in officer profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  res.json({ success: true, officer: req.user });
});

export default router;
