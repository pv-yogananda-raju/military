import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import mongoose from 'mongoose';
import mockDb from '../config/mockDb.js';
import AuditLog from '../models/AuditLog.js';
import Evidence from '../models/Evidence.js';
import Message from '../models/Message.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Ensure public uploads directory exists for local fallback
const publicUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

// @desc    Upload any single file (image, doc, audio, video)
// @route   POST /api/upload
// @access  Private
// Helper function to stream upload to Cloudinary directly from memory buffer
const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'miscs_uploads',
        public_id: path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now()
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// @desc    Upload any single file (image, doc, audio, video)
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Upload Rejection: No file packet detected.' });
    }

    const fileSize = req.file.size;
    const fileMime = req.file.mimetype;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const uniqueFileName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${fileExt}`;

    // Dynamic Size Validation
    // Profile pics & Suspect photos (Images): Capped at 5 MB
    if (fileMime.startsWith('image/')) {
      if (fileSize > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Security Protocol Rejection: Operative and suspect photos are strictly capped at 5 MB. Attempted: ${(fileSize / (1024 * 1024)).toFixed(2)} MB.`
        });
      }
    } else {
      // Evidence files, dossiers, and multimedia: Capped at 25 MB
      if (fileSize > 25 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Security Protocol Rejection: Classified evidence files and audio/video archives are capped at 25 MB. Attempted: ${(fileSize / (1024 * 1024)).toFixed(2)} MB.`
        });
      }
    }
    
    let finalUrl = '';
    let storageType = 'Local Server';

    // 1. Cloudinary upload if configured
    if (isCloudinaryConfigured) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        finalUrl = uploadResult.secure_url;
        storageType = 'Cloudinary Secure Storage';
      } catch (cloudinaryError) {
        console.error('[Cloudinary Upload Failure]', cloudinaryError);
        // Fallback to local copy if Cloudinary upload fails
        const localPath = path.join(publicUploadsDir, uniqueFileName);
        fs.writeFileSync(localPath, req.file.buffer);
        finalUrl = `${req.protocol}://${req.get('host')}/public/uploads/${uniqueFileName}`;
      }
    } else {
      // 2. Local fallback storage
      const localPath = path.join(publicUploadsDir, uniqueFileName);
      fs.writeFileSync(localPath, req.file.buffer);
      finalUrl = `${req.protocol}://${req.get('host')}/public/uploads/${uniqueFileName}`;
    }

    // 3. Log Audit Trail
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `Uploaded file "${req.file.originalname}" (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) to ${storageType}.`;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (isDbOffline) {
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Evidence',
        action: action + ' (In-Memory)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });
    } else {
      await AuditLog.create({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'Evidence',
        action,
        ipAddress: req.ip || '127.0.0.1',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Secure transmission upload completed successfully.',
      file: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype.split('/')[0] === 'application' ? 'Document' : req.file.mimetype.split('/')[0].toUpperCase(),
        fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileUrl: finalUrl,
        storageType
      }
    });
  } catch (error) {
    console.error(`[Upload Controller Error] ${error.message}`);
    res.status(500).json({ success: false, message: `Upload failed: ${error.message}` });
  }
});

// @desc    Get all uploaded files (from Evidence Locker and Comms Chat) for Admin monitoring
// @route   GET /api/upload/admin/monitor
// @access  Private (Admin Commander only)
router.get('/admin/monitor', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;
    const { search } = req.query;
    let files = [];

    // 1. Fetch from Evidence
    let evidenceItems = [];
    if (isDbOffline) {
      evidenceItems = [...mockDb.evidence];
    } else {
      evidenceItems = await Evidence.find({});
    }

    evidenceItems.forEach(item => {
      files.push({
        id: item.evidenceId,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileType: item.fileType,
        fileUrl: item.fileUrl,
        source: 'Evidence Locker',
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      });
    });

    // 2. Fetch from Chat messages attachments
    let chatMessages = [];
    if (isDbOffline) {
      chatMessages = mockDb.messages.filter(m => m.attachments && m.attachments.length > 0);
    } else {
      chatMessages = await Message.find({ attachments: { $exists: true, $not: { $size: 0 } } });
    }

    chatMessages.forEach(msg => {
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach((att, idx) => {
          files.push({
            id: `${msg.messageId}-${idx}`,
            messageId: msg.messageId,
            attachmentIndex: idx,
            fileName: att.fileName,
            fileSize: att.fileSize,
            fileType: att.fileType,
            fileUrl: att.fileUrl,
            source: 'Comms Chat Attachment',
            uploadedBy: msg.sender,
            createdAt: msg.createdAt,
          });
        });
      }
    });

    // Sort by latest uploads
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      files = files.filter(f => 
        f.fileName.toLowerCase().includes(s) || 
        f.uploadedBy.toLowerCase().includes(s) || 
        f.source.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, count: files.length, files });
  } catch (error) {
    console.error(`[GET Admin Monitor Uploads Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access uploaded files logs.' });
  }
});

// @desc    Delete/expunge an uploaded file or chat attachment
// @route   DELETE /api/upload/admin/monitor/:source/:id
// @access  Private (Admin Commander only)
router.delete('/admin/monitor/:source/:id', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { source, id } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (source === 'Evidence Locker') {
      // Delete Evidence item
      if (isDbOffline) {
        const idx = mockDb.evidence.findIndex(e => e.evidenceId === id);
        if (idx === -1) {
          return res.status(404).json({ success: false, message: 'Evidence file registry not found.' });
        }
        const name = mockDb.evidence[idx].fileName;
        mockDb.evidence.splice(idx, 1);
        
        mockDb.auditLogs.unshift({
          logId,
          user: `${req.user.fullName} (${req.user.officerId})`,
          module: 'System',
          action: `Admin permanently expunged Evidence file: [${id}] "${name}" via Monitor. (In-Memory)`,
          ipAddress: req.ip || '127.0.0.1',
          createdAt: new Date(),
        });
      } else {
        const file = await Evidence.findOne({ evidenceId: id });
        if (!file) {
          return res.status(404).json({ success: false, message: 'Evidence file registry not found.' });
        }

        // Purge from Cloudinary if configured
        if (isCloudinaryConfigured && file.fileUrl && file.fileUrl.includes('cloudinary.com')) {
          try {
            const publicId = extractCloudinaryPublicId(file.fileUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`[Cloudinary Purge] Expunged monitor evidence asset ${publicId} successfully.`);
            }
          } catch (cloudinaryError) {
            console.error('[Cloudinary Purge Failure]', cloudinaryError);
          }
        }

        await Evidence.deleteOne({ evidenceId: id });
        
        await AuditLog.create({
          logId,
          user: `${req.user.fullName} (${req.user.officerId})`,
          module: 'System',
          action: `Admin permanently expunged Evidence file: [${id}] "${file.fileName}" via Monitor.`,
          ipAddress: req.ip || '127.0.0.1',
        });
      }
      return res.json({ success: true, message: 'Evidence locker file expunged successfully.' });

    } else if (source === 'Comms Chat Attachment') {
      // Delete Chat attachment
      // The id in this case contains the messageId and attachment index (e.g. MSG-123456-0)
      const parts = id.split('-');
      if (parts.length < 2) {
        return res.status(400).json({ success: false, message: 'Invalid attachment reference ID.' });
      }
      const messageId = `${parts[0]}-${parts[1]}`;
      const attIndex = parseInt(parts[2], 10) || 0;

      if (isDbOffline) {
        const msg = mockDb.messages.find(m => m.messageId === messageId);
        if (!msg) {
          return res.status(404).json({ success: false, message: 'Chat message not found.' });
        }
        
        let name = '';
        if (msg.attachments && msg.attachments[attIndex]) {
          name = msg.attachments[attIndex].fileName;
          msg.attachments.splice(attIndex, 1);
        }
        
        mockDb.auditLogs.unshift({
          logId,
          user: `${req.user.fullName} (${req.user.officerId})`,
          module: 'System',
          action: `Admin permanently expunged Comms chat attachment: "${name}" from message [${messageId}] via Monitor. (In-Memory)`,
          ipAddress: req.ip || '127.0.0.1',
          createdAt: new Date(),
        });
      } else {
        const msg = await Message.findOne({ messageId });
        if (!msg) {
          return res.status(404).json({ success: false, message: 'Chat message not found.' });
        }
        
        let name = '';
        if (msg.attachments && msg.attachments[attIndex]) {
          const attachment = msg.attachments[attIndex];
          name = attachment.fileName;

          // Purge from Cloudinary if configured
          if (isCloudinaryConfigured && attachment.fileUrl && attachment.fileUrl.includes('cloudinary.com')) {
            try {
              const publicId = extractCloudinaryPublicId(attachment.fileUrl);
              if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`[Cloudinary Purge] Expunged monitor chat attachment asset ${publicId} successfully.`);
              }
            } catch (cloudinaryError) {
              console.error('[Cloudinary Purge Failure]', cloudinaryError);
            }
          }

          msg.attachments.splice(attIndex, 1);
          msg.markModified('attachments');
          await msg.save();
        }

        await AuditLog.create({
          logId,
          user: `${req.user.fullName} (${req.user.officerId})`,
          module: 'System',
          action: `Admin permanently expunged Comms chat attachment: "${name}" from message [${messageId}] via Monitor.`,
          ipAddress: req.ip || '127.0.0.1',
        });
      }
      return res.json({ success: true, message: 'Comms chat attachment expunged successfully.' });

    } else {
      return res.status(400).json({ success: false, message: 'Unknown upload source.' });
    }
  } catch (error) {
    console.error(`[DELETE Admin Monitor Upload Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to expunge uploaded file.' });
  }
});

export default router;
