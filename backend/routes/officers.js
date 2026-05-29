import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Officer from '../models/Officer.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all officers with search and role filtering
// @route   GET /api/officers
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, role, status, page, limit, sortBy, sortOrder } = req.query;
    const isDbOffline = mongoose.connection.readyState !== 1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    const sField = sortBy || 'createdAt';
    const sOrder = sortOrder === 'asc' ? 1 : -1;

    if (isDbOffline) {
      let filtered = [...mockDb.officers];

      if (role) filtered = filtered.filter(o => o.role === role);
      if (status) filtered = filtered.filter(o => o.status === status);

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(o => 
          o.fullName.toLowerCase().includes(s) ||
          o.officerId.toLowerCase().includes(s) ||
          o.rank.toLowerCase().includes(s) ||
          o.department.toLowerCase().includes(s)
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

      // Pagination
      const paginated = filtered.slice(skipNum, skipNum + limitNum);

      const resOfficers = paginated.map(o => {
        const copy = { ...o };
        delete copy.passwordHash;
        if (req.user.role !== 'Admin Commander') {
          delete copy.plainPassword;
        }
        return copy;
      });

      return res.json({ 
        success: true, 
        count: filtered.length, 
        page: pageNum, 
        totalPages: Math.ceil(filtered.length / limitNum), 
        officers: resOfficers 
      });
    }

    // Standard database call
    let query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { officerId: { $regex: search, $options: 'i' } },
        { rank: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await Officer.countDocuments(query);
    const rawOfficers = await Officer.find(query)
      .select('-passwordHash')
      .sort({ [sField]: sOrder })
      .skip(skipNum)
      .limit(limitNum);

    const officers = rawOfficers.map(o => {
      const obj = o.toObject();
      if (req.user.role !== 'Admin Commander') {
        delete obj.plainPassword;
      }
      return obj;
    });

    res.json({ 
      success: true, 
      count: totalCount, 
      page: pageNum, 
      totalPages: Math.ceil(totalCount / limitNum), 
      officers 
    });
  } catch (error) {
    console.error(`[GET Officers Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve officer directory.' });
  }
});

// @desc    Create new officer record
// @route   POST /api/officers
// @access  Private (Admin Commander clearance only)
router.post('/', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { 
      officerId, fullName, rank, role, department, clearanceLevel, email, phone, password, status, profileImage,
      dob, bloodGroup, branchUnit, enlistmentDate, cardIssueDate, cardExpirationDate, issuingAuthority, identificationMarks
    } = req.body;

    if (!officerId || !fullName || !rank || !role || !department || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Created new officer profile for ${fullName} (${officerId}) assigned to ${department}.`;

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    if (isDbOffline) {
      const existing = mockDb.officers.find(o => o.officerId === officerId.toUpperCase());
      if (existing) {
        return res.status(400).json({ success: false, message: `Registration Conflict: ID [${officerId}] already exists.` });
      }

      const newOfficer = {
        officerId: officerId.toUpperCase(),
        fullName,
        rank,
        role,
        department,
        clearanceLevel: clearanceLevel || 'Level 1',
        contactDetails: { email, phone },
        passwordHash,
        plainPassword: password,
        status: status || 'Active',
        profileImage: profileImage || 'https://images.unsplash.com/photo-1579567724489-2fed7c8f9de6?auto=format&fit=crop&q=80&w=200',
        dob: dob || '1988-06-15',
        bloodGroup: bloodGroup || 'O+',
        branchUnit: branchUnit || 'Cyber warfare division',
        enlistmentDate: enlistmentDate || '2010-08-20',
        cardIssueDate: cardIssueDate || '2025-01-01',
        cardExpirationDate: cardExpirationDate || '2035-01-01',
        issuingAuthority: issuingAuthority || 'SECURED COMMAND SYSTEM',
        identificationMarks: identificationMarks || 'None declared.',
        createdAt: new Date(),
      };

      mockDb.officers.unshift(newOfficer);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Officers',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      const resOfficer = { ...newOfficer };
      delete resOfficer.passwordHash;
      return res.status(201).json({ success: true, officer: resOfficer });
    }

    const uOfficerId = officerId.toUpperCase();
    const existingOfficer = await Officer.findOne({ officerId: uOfficerId });
    if (existingOfficer) {
      return res.status(400).json({ success: false, message: `Registration Conflict: ID [${officerId}] already exists.` });
    }

    const newOfficer = await Officer.create({
      officerId: uOfficerId,
      fullName,
      rank,
      role,
      department,
      clearanceLevel,
      contactDetails: { email, phone },
      passwordHash,
      plainPassword: password,
      status: status || 'Active',
      profileImage: profileImage || undefined,
      dob: dob || undefined,
      bloodGroup: bloodGroup || undefined,
      branchUnit: branchUnit || undefined,
      enlistmentDate: enlistmentDate || undefined,
      cardIssueDate: cardIssueDate || undefined,
      cardExpirationDate: cardExpirationDate || undefined,
      issuingAuthority: issuingAuthority || undefined,
      identificationMarks: identificationMarks || undefined,
    });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Officers',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    const officerResponse = newOfficer.toObject();
    delete officerResponse.passwordHash;

    res.status(201).json({ success: true, officer: officerResponse });
  } catch (error) {
    console.error(`[POST Officer Error] ${error.message}`);
    res.status(500).json({ success: false, message: `Failed to register officer: ${error.message}` });
  }
});

// @desc    Update officer details
// @route   PUT /api/officers/:officerId
// @access  Private
router.put('/:officerId', protect, async (req, res) => {
  try {
    const { officerId } = req.params;
    const { 
      fullName, rank, role, department, clearanceLevel, email, phone, status, profileImage, password,
      dob, bloodGroup, branchUnit, enlistmentDate, cardIssueDate, cardExpirationDate, issuingAuthority, identificationMarks
    } = req.body;

    const isOwner = req.user.officerId === officerId;
    const isAdmin = req.user.role === 'Admin Commander';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not have clearance to modify this profile.' });
    }

    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const officer = mockDb.officers.find(o => o.officerId === officerId);
      if (!officer) {
        return res.status(404).json({ success: false, message: 'Officer profile not found.' });
      }

      if (isAdmin) {
        if (role) officer.role = role;
        if (clearanceLevel) officer.clearanceLevel = clearanceLevel;
        if (department) officer.department = department;
        if (dob) officer.dob = dob;
        if (bloodGroup) officer.bloodGroup = bloodGroup;
        if (branchUnit) officer.branchUnit = branchUnit;
        if (enlistmentDate) officer.enlistmentDate = enlistmentDate;
        if (cardIssueDate) officer.cardIssueDate = cardIssueDate;
        if (cardExpirationDate) officer.cardExpirationDate = cardExpirationDate;
        if (issuingAuthority) officer.issuingAuthority = issuingAuthority;
        if (identificationMarks) officer.identificationMarks = identificationMarks;
      }

      if (fullName) officer.fullName = fullName;
      if (rank) officer.rank = rank;
      if (status) officer.status = status;
      if (profileImage) officer.profileImage = profileImage;
      if (email) officer.contactDetails.email = email;
      if (phone) officer.contactDetails.phone = phone;

      if (password) {
        const salt = bcrypt.genSaltSync(10);
        officer.passwordHash = bcrypt.hashSync(password, salt);
        officer.plainPassword = password;
      }

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Officers',
        action: `Modified officer profile details for ${officer.fullName} (${officer.officerId}). (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      const resOfficer = { ...officer };
      delete resOfficer.passwordHash;
      return res.json({ success: true, officer: resOfficer });
    }

    const officer = await Officer.findOne({ officerId });
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer profile not found.' });
    }

    if (isAdmin) {
      if (role) officer.role = role;
      if (clearanceLevel) officer.clearanceLevel = clearanceLevel;
      if (department) officer.department = department;
      if (dob) officer.dob = dob;
      if (bloodGroup) officer.bloodGroup = bloodGroup;
      if (branchUnit) officer.branchUnit = branchUnit;
      if (enlistmentDate) officer.enlistmentDate = enlistmentDate;
      if (cardIssueDate) officer.cardIssueDate = cardIssueDate;
      if (cardExpirationDate) officer.cardExpirationDate = cardExpirationDate;
      if (issuingAuthority) officer.issuingAuthority = issuingAuthority;
      if (identificationMarks) officer.identificationMarks = identificationMarks;
    }

    if (fullName) officer.fullName = fullName;
    if (rank) officer.rank = rank;
    if (status) officer.status = status;
    if (profileImage) officer.profileImage = profileImage;
    if (email) officer.contactDetails.email = email;
    if (phone) officer.contactDetails.phone = phone;

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      officer.passwordHash = bcrypt.hashSync(password, salt);
      officer.plainPassword = password;
    }

    await officer.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Officers',
      action: `Modified officer profile details for ${officer.fullName} (${officer.officerId}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    const officerResponse = officer.toObject();
    delete officerResponse.passwordHash;

    res.json({ success: true, officer: officerResponse });
  } catch (error) {
    console.error(`[PUT Officer Error] ${error.message}`);
    res.status(500).json({ success: false, message: `Failed to update officer profile: ${error.message}` });
  }
});

// @desc    Delete officer
// @route   DELETE /api/officers/:officerId
// @access  Private (Admin Commander only)
router.delete('/:officerId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { officerId } = req.params;

    if (req.user.officerId === officerId) {
      return res.status(400).json({ success: false, message: 'Security Breach Prevention: An Admin Commander cannot self-terminate profiles.' });
    }

    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const idx = mockDb.officers.findIndex(o => o.officerId === officerId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Officer profile not found.' });
      }
      const name = mockDb.officers[idx].fullName;
      mockDb.officers.splice(idx, 1);

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Officers',
        action: `Permanently expunged officer profile: ${name} (${officerId}). (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Officer profile ${officerId} successfully expunged.` });
    }

    const officer = await Officer.findOne({ officerId });
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer profile not found.' });
    }

    await Officer.deleteOne({ officerId });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName}
      (${req.user.officerId})`,
      module: 'Officers',
      action: `Permanently expunged officer profile: ${officer.fullName} (${officerId}).`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Officer profile ${officerId} successfully expunged.` });
  } catch (error) {
    console.error(`[DELETE Officer Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge officer record.' });
  }
});

// @desc    Get all officer credentials (password hashes) for Admin audit
// @route   GET /api/officers/admin/credentials
// @access  Private (Admin Commander only)
router.get('/admin/credentials', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;
    let list = [];
    if (isDbOffline) {
      list = [...mockDb.officers];
    } else {
      list = await Officer.find({});
    }

    const credentials = list.map(o => ({
      officerId: o.officerId,
      fullName: o.fullName,
      rank: o.rank,
      role: o.role,
      passwordHash: o.passwordHash,
      plainPassword: o.plainPassword || 'password123',
    }));

    res.json({ success: true, count: credentials.length, credentials });
  } catch (error) {
    console.error(`[GET Admin Credentials Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access security database credentials.' });
  }
});

export default router;
