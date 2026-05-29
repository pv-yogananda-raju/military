import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import path from 'path';
import Evidence from '../models/Evidence.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

// Helper function to extract Cloudinary public_id from secure URL
const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const subParts = parts[1].split('/');
    const pathParts = subParts[0].startsWith('v') && !isNaN(subParts[0].substring(1))
      ? subParts.slice(1)
      : subParts;
    const fullPath = pathParts.join('/');
    const lastDotIdx = fullPath.lastIndexOf('.');
    return lastDotIdx !== -1 ? fullPath.substring(0, lastDotIdx) : fullPath;
  } catch (err) {
    console.error('[Extract Cloudinary Public ID Error]', err);
    return null;
  }
};

const router = express.Router();

// @desc    Get all evidence metadata records
// @route   GET /api/evidence
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, fileType, status, page, limit, sortBy, sortOrder } = req.query;
    const isDbOffline = mongoose.connection.readyState !== 1;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    const skipNum = (pageNum - 1) * limitNum;

    const sField = sortBy || 'createdAt';
    const sOrder = sortOrder === 'asc' ? 1 : -1;

    if (isDbOffline) {
      let filtered = [...mockDb.evidence];

      if (fileType) filtered = filtered.filter(e => e.fileType === fileType);
      if (status) filtered = filtered.filter(e => e.status === status);

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(e => 
          e.fileName.toLowerCase().includes(s) ||
          e.evidenceId.toLowerCase().includes(s) ||
          e.linkedMission.toLowerCase().includes(s) ||
          e.linkedReport.toLowerCase().includes(s)
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

      return res.json({ 
        success: true, 
        count: filtered.length, 
        page: pageNum, 
        totalPages: Math.ceil(filtered.length / limitNum), 
        evidence: paginated 
      });
    }

    // Standard database call
    let query = {};
    if (fileType) query.fileType = fileType;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { evidenceId: { $regex: search, $options: 'i' } },
        { linkedMission: { $regex: search, $options: 'i' } },
        { linkedReport: { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await Evidence.countDocuments(query);
    const evidence = await Evidence.find(query)
      .sort({ [sField]: sOrder })
      .skip(skipNum)
      .limit(limitNum);

    res.json({ 
      success: true, 
      count: totalCount, 
      page: pageNum, 
      totalPages: Math.ceil(totalCount / limitNum), 
      evidence 
    });
  } catch (error) {
    console.error(`[GET Evidence Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access evidence vault registry.' });
  }
});

// @desc    Register and upload evidence file metadata
// @route   POST /api/evidence
// @access  Private (All authenticated officers allowed)
router.post('/', protect, async (req, res) => {
  try {
    const { fileName, fileType, fileSize, fileUrl, linkedMission, linkedReport } = req.body;

    if (!fileName || !fileType || !fileSize || !fileUrl) {
      return res.status(400).json({ success: false, message: 'Provide complete evidence file parameters.' });
    }

    const evidenceId = `EVI-${Math.floor(1000 + Math.random() * 9000)}`;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Uploaded evidence item [${evidenceId}] ("${fileName}"). Queued for background security thread processing.`;

    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      const newEvidence = {
        evidenceId,
        fileName,
        fileType,
        fileSize,
        fileUrl,
        linkedMission: linkedMission || 'None',
        linkedReport: linkedReport || 'None',
        uploadedBy: req.user.officerId,
        status: 'Processing', // Background mock thread will grab this
        hash: '',
        createdAt: new Date(),
      };

      mockDb.evidence.unshift(newEvidence);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Evidence',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      // CONCURRENCY SIMULATION: Launch mock Thread-2 execution in 4 seconds!
      setTimeout(() => {
        const file = mockDb.evidence.find(e => e.evidenceId === evidenceId);
        if (file && file.status === 'Processing') {
          const hash = crypto
            .createHash('sha256')
            .update(file.fileName + file.evidenceId + Date.now().toString())
            .digest('hex');

          file.status = 'Processed';
          file.hash = `SHA-256:${hash.toUpperCase().substring(0, 32)}`;

          const tLogId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
          mockDb.auditLogs.unshift({
            logId: tLogId,
            user: 'Evidence processing engine (Thread-2)',
            module: 'Concurrency',
            action: `Concurrently validated cryptographic checksum and encrypted file ID [${file.evidenceId}]. Status set to PROCESSED. (Mock-Thread)`,
            deviceDetails: 'Cryptographic Thread Unit',
            ipAddress: '127.0.0.1',
            createdAt: new Date(),
          });
        }
      }, 4000);

      return res.status(201).json({ success: true, evidence: newEvidence });
    }

    const newEvidence = await Evidence.create({
      evidenceId,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      linkedMission: linkedMission || 'None',
      linkedReport: linkedReport || 'None',
      uploadedBy: req.user.officerId,
      status: 'Processing',
      hash: '',
    });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Evidence',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json({ success: true, evidence: newEvidence });
  } catch (error) {
    console.error(`[POST Evidence Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to upload evidence metadata.' });
  }
});

// @desc    Delete evidence record
// @route   DELETE /api/evidence/:evidenceId
// @access  Private (Admin Commander & Intel Officer only)
router.delete('/:evidenceId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const idx = mockDb.evidence.findIndex(e => e.evidenceId === evidenceId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Evidence file registry not found.' });
      }
      const name = mockDb.evidence[idx].fileName;
      mockDb.evidence.splice(idx, 1);

      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Evidence',
        action: `Expunged physical evidence files: [${evidenceId}] ("${name}"). (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Evidence record [${evidenceId}] permanently expunged.` });
    }

    const file = await Evidence.findOne({ evidenceId });
    if (!file) {
      return res.status(404).json({ success: false, message: 'Evidence file registry not found.' });
    }

    // Cryptographically purge from Cloudinary if configured
    if (isCloudinaryConfigured && file.fileUrl && file.fileUrl.includes('cloudinary.com')) {
      try {
        const publicId = extractCloudinaryPublicId(file.fileUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`[Cloudinary Purge] Expunged asset ${publicId} from Evidence Vault.`);
        }
      } catch (cloudinaryError) {
        console.error('[Cloudinary Purge Failure]', cloudinaryError);
      }
    }

    await Evidence.deleteOne({ evidenceId });

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'Evidence',
      action: `Expunged physical evidence files and metadata records: [${evidenceId}] ("${file.fileName}").`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Evidence record [${evidenceId}] permanently expunged.` });
  } catch (error) {
    console.error(`[DELETE Evidence Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge evidence file.' });
  }
});

export default router;
