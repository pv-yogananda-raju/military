import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Officer from '../models/Officer.js';
import AuditLog from '../models/AuditLog.js';
import mockDb from '../config/mockDb.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get chat message logs (1-to-1 or Global channel)
// @route   GET /api/chat/messages
// @access  Private
router.get('/messages', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;
    const recipient = req.query.recipient || 'GLOBAL'; // target officerId or 'GLOBAL'

    // 1. Fetch active officers to construct a fast sender lookup map
    let officersList = [];
    if (isDbOffline) {
      officersList = [...mockDb.officers];
    } else {
      officersList = await Officer.find({});
    }

    const officersMap = officersList.reduce((acc, curr) => {
      acc[curr.officerId] = {
        fullName: curr.fullName,
        rank: curr.rank,
        role: curr.role,
        profileImage: curr.profileImage,
        groupChatAccess: curr.groupChatAccess !== false,
      };
      return acc;
    }, {});

    // 2. Fetch raw message logs (limit 100)
    let rawMessages = [];
    if (isDbOffline) {
      if (recipient === 'GLOBAL') {
        rawMessages = mockDb.messages.filter(m => m.recipient === 'GLOBAL');
      } else {
        const userA = req.user.officerId;
        const userB = recipient;
        rawMessages = mockDb.messages.filter(
          m => 
            (m.sender === userA && m.recipient === userB) ||
            (m.sender === userB && m.recipient === userA)
        );
      }
    } else {
      if (recipient === 'GLOBAL') {
        rawMessages = await Message.find({ recipient: 'GLOBAL' })
          .sort({ createdAt: -1 })
          .limit(100);
      } else {
        const userA = req.user.officerId;
        const userB = recipient;
        rawMessages = await Message.find({
          $or: [
            { sender: userA, recipient: userB },
            { sender: userB, recipient: userA }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(100);
      }
      // Re-sort to chronological for Mongoose output since we sorted by desc to fetch latest
      rawMessages = rawMessages.reverse();
    }

    // 3. Enrich messages with sender details
    const enrichedMessages = rawMessages.map(msg => {
      const obj = typeof msg.toObject === 'function' ? msg.toObject() : { ...msg };
      const senderInfo = officersMap[obj.sender] || {
        fullName: 'Unknown Operative',
        rank: 'Operative',
        role: 'Field Officer',
        profileImage: 'https://images.unsplash.com/photo-1579567724489-2fed7c8f9de6?auto=format&fit=crop&q=80&w=200',
        groupChatAccess: true,
      };

      obj.senderName = senderInfo.fullName;
      obj.senderRank = senderInfo.rank;
      obj.senderRole = senderInfo.role;
      obj.senderImage = senderInfo.profileImage;
      return obj;
    });

    // In mockDb sorting is already chronological, but let's sort to be absolutely safe
    enrichedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, count: enrichedMessages.length, messages: enrichedMessages });
  } catch (error) {
    console.error(`[GET Comms Messages Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access secure comms logs.' });
  }
});

// @desc    Broadcast a secure comms message (1-1 or Global Group channel)
// @route   POST /api/chat/messages
// @access  Private
router.post('/messages', protect, async (req, res) => {
  try {
    const { recipient, content, attachments } = req.body;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (!recipient || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient and encrypted contents are required.' });
    }

    // Enforce Commander Comms REVOCATION check for ALL communications!
    let sendingOfficer = null;
    if (isDbOffline) {
      sendingOfficer = mockDb.officers.find(o => o.officerId === req.user.officerId);
    } else {
      sendingOfficer = await Officer.findOne({ officerId: req.user.officerId });
    }

    if (sendingOfficer && sendingOfficer.groupChatAccess === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tactical comms lockout: Your communications clearance has been suspended by Commander directive.' 
      });
    }

    const messageId = `MSG-${Math.floor(100000 + Math.random() * 900000)}`;
    const messageData = {
      messageId,
      sender: req.user.officerId,
      recipient,
      content: content.trim(),
      isGroupChat: recipient === 'GLOBAL',
      attachments: attachments || [],
      createdAt: new Date(),
    };

    if (isDbOffline) {
      mockDb.messages.push(messageData);
      
      // Fetch sender details to return an enriched copy
      const sender = mockDb.officers.find(o => o.officerId === req.user.officerId) || req.user;
      const returnedMessage = {
        ...messageData,
        senderName: sender.fullName,
        senderRank: sender.rank,
        senderRole: sender.role,
        senderImage: sender.profileImage,
      };

      return res.status(201).json({ success: true, message: returnedMessage });
    }

    const message = await Message.create(messageData);
    
    const returnedMessage = message.toObject();
    returnedMessage.senderName = req.user.fullName;
    returnedMessage.senderRank = req.user.rank;
    returnedMessage.senderRole = req.user.role;
    returnedMessage.senderImage = req.user.profileImage;

    res.status(201).json({ success: true, message: returnedMessage });
  } catch (error) {
    console.error(`[POST Comms Message Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to encrypt and transmit message.' });
  }
});

// @desc    Reset/Purge chat history for group or private chat
// @route   DELETE /api/chat/messages/reset
// @access  Private
router.delete('/messages/reset', protect, async (req, res) => {
  try {
    const { recipient } = req.query;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient channel is required for purging.' });
    }

    if (recipient === 'GLOBAL') {
      const action = `Operative [${req.user.fullName} (${req.user.officerId})] purged all transmissions on the GLOBAL secure broadcast net link.`;

      if (isDbOffline) {
        // Remove all global messages from in-memory array
        mockDb.messages = mockDb.messages.filter(m => m.recipient !== 'GLOBAL');
        try {
          mockDb.auditLogs.unshift({
            logId,
            user: `${req.user.fullName} (${req.user.officerId})`,
            module: 'Comms',
            action: action + ' (In-Memory)',
            ipAddress: req.ip || '127.0.0.1',
            createdAt: new Date(),
          });
        } catch (e) {
          console.error(`[Audit Log Memory Error]`, e);
        }
      } else {
        await Message.deleteMany({ recipient: 'GLOBAL' });
        try {
          await AuditLog.create({
            logId,
            user: `${req.user.fullName} (${req.user.officerId})`,
            module: 'Comms',
            action,
            ipAddress: req.ip || '127.0.0.1',
          });
        } catch (auditError) {
          console.error(`[Audit Log Mongoose Error]`, auditError);
        }
      }

      return res.json({ success: true, message: 'Global Tactical Net comms history purged successfully.' });
    } else {
      // Private chat reset between req.user.officerId and recipient
      const userA = req.user.officerId;
      const userB = recipient;
      const action = `Operative purged secure communications feed between [${userA}] and [${userB}].`;

      if (isDbOffline) {
        mockDb.messages = mockDb.messages.filter(m => 
          !(
            (m.sender === userA && m.recipient === userB) ||
            (m.sender === userB && m.recipient === userA)
          )
        );
        try {
          mockDb.auditLogs.unshift({
            logId,
            user: `${req.user.fullName} (${req.user.officerId})`,
            module: 'Comms',
            action: action + ' (In-Memory)',
            ipAddress: req.ip || '127.0.0.1',
            createdAt: new Date(),
          });
        } catch (e) {
          console.error(`[Audit Log Memory Error]`, e);
        }
      } else {
        await Message.deleteMany({
          $or: [
            { sender: userA, recipient: userB },
            { sender: userB, recipient: userA }
          ]
        });
        try {
          await AuditLog.create({
            logId,
            user: `${req.user.fullName} (${req.user.officerId})`,
            module: 'Comms',
            action,
            ipAddress: req.ip || '127.0.0.1',
          });
        } catch (auditError) {
          console.error(`[Audit Log Mongoose Error]`, auditError);
        }
      }

      return res.json({ success: true, message: `Secure comms link [${userA} ↔ ${userB}] purged successfully.` });
    }
  } catch (error) {
    console.error(`[DELETE Comms Reset Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to purge communications feed.' });
  }
});

// @desc    Delete an individual message (by author or Admin Commander)
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
router.delete('/messages/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    let message;
    if (isDbOffline) {
      message = mockDb.messages.find(m => m.messageId === messageId);
    } else {
      message = await Message.findOne({ messageId });
    }

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message packet not found.' });
    }

    // Gating: Must be the sender of the message OR Admin Commander
    if (message.sender !== req.user.officerId && req.user.role !== 'Admin Commander') {
      return res.status(403).json({ success: false, message: 'Classified: Not authorized to expunge this transmission.' });
    }

    const action = `Deleted individual chat message [${messageId}] (Sender: ${message.sender}, Recipient: ${message.recipient}).`;

    if (isDbOffline) {
      const idx = mockDb.messages.findIndex(m => m.messageId === messageId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Message packet not found in cache.' });
      }
      mockDb.messages.splice(idx, 1);
      try {
        mockDb.auditLogs.unshift({
          logId,
          user: `${req.user.fullName} (${req.user.officerId})`,
          module: 'Comms',
          action: action + ' (In-Memory)',
          ipAddress: req.ip || '127.0.0.1',
          createdAt: new Date(),
        });
      } catch (e) {}
    } else {
      await Message.deleteOne({ messageId });
      try {
        await AuditLog.create({
          logId,
          user: `${req.user.fullName} (${req.user.officerId})`,
          module: 'Comms',
          action,
          ipAddress: req.ip || '127.0.0.1',
        });
      } catch (auditError) {
        console.error(`[Audit Log Delete Message Error]`, auditError);
      }
    }

    res.json({ success: true, message: 'Message transmission successfully expunged from database.' });
  } catch (error) {
    console.error(`[DELETE Message Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete message packet.' });
  }
});

// @desc    Get all recent messages involving the logged-in user (private + global)
// @route   GET /api/chat/messages/recent
// @access  Private
router.get('/messages/recent', protect, async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;
    const userA = req.user.officerId;

    let list = [];
    if (isDbOffline) {
      list = [...mockDb.messages];
    } else {
      list = await Message.find({
        $or: [
          { recipient: 'GLOBAL' },
          { sender: userA },
          { recipient: userA }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(100);
    }

    // Sort chronologically
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, count: list.length, messages: list });
  } catch (error) {
    console.error(`[GET Comms Recent Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access recent secure messages matrix.' });
  }
});

// @desc    Toggle group chat access status for an officer
// @route   PUT /api/chat/access/:officerId
// @access  Private (Admin Commander only)
router.put('/access/:officerId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { officerId } = req.params;
    const { groupChatAccess } = req.body;
    const isDbOffline = mongoose.connection.readyState !== 1;

    if (groupChatAccess === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide groupChatAccess status parameter.' });
    }

    const targetId = officerId.toUpperCase();
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const action = `${groupChatAccess ? 'Restored' : 'Suspended'} secure group chat access credentials for operative: [${targetId}].`;

    if (isDbOffline) {
      const officer = mockDb.officers.find(o => o.officerId === targetId);
      if (!officer) {
        return res.status(404).json({ success: false, message: 'Officer dossier not found.' });
      }

      officer.groupChatAccess = groupChatAccess;
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: action + ' (In-Memory Fallback)',
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });

      return res.json({ success: true, message: `Broadcasting access for [${targetId}] updated.`, groupChatAccess });
    }

    const officer = await Officer.findOne({ officerId: targetId });
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Officer dossier not found.' });
    }

    officer.groupChatAccess = groupChatAccess;
    await officer.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Broadcasting access for [${targetId}] updated.`, groupChatAccess });
  } catch (error) {
    console.error(`[PUT Comms Access Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to update tactical comms permission credentials.' });
  }
});

// @desc    Get all conversations for Admin oversight
// @route   GET /api/chat/admin/conversations
// @access  Private (Admin Commander only)
router.get('/admin/conversations', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const isDbOffline = mongoose.connection.readyState !== 1;
    let allMessages = [];
    let officersList = [];

    if (isDbOffline) {
      allMessages = [...mockDb.messages];
      officersList = [...mockDb.officers];
    } else {
      allMessages = await Message.find({});
      const Officer = mongoose.model('Officer');
      officersList = await Officer.find({});
    }

    const officersMap = officersList.reduce((acc, curr) => {
      acc[curr.officerId] = {
        fullName: curr.fullName,
        rank: curr.rank,
        role: curr.role,
        profileImage: curr.profileImage,
      };
      return acc;
    }, {});

    // Filter out group chat messages to get private conversations
    const privateMsgs = allMessages.filter(m => m.recipient !== 'GLOBAL');

    // Group by unique pairs
    const conversations = {};
    privateMsgs.forEach(msg => {
      const uA = msg.sender;
      const uB = msg.recipient;
      const key = [uA, uB].sort().join(':');

      if (!conversations[key]) {
        conversations[key] = {
          key,
          officerA: uA,
          officerB: uB,
          lastMessage: msg,
          messageCount: 0
        };
      }
      conversations[key].messageCount += 1;
      
      // Keep track of the latest message
      if (new Date(msg.createdAt) > new Date(conversations[key].lastMessage.createdAt)) {
        conversations[key].lastMessage = msg;
      }
    });

    const enrichedConversations = Object.values(conversations).map(conv => {
      const infoA = officersMap[conv.officerA] || { fullName: 'Unknown', rank: 'Operative', role: 'Officer' };
      const infoB = officersMap[conv.officerB] || { fullName: 'Unknown', rank: 'Operative', role: 'Officer' };
      return {
        ...conv,
        officerAName: infoA.fullName,
        officerARank: infoA.rank,
        officerAPic: infoA.profileImage,
        officerBName: infoB.fullName,
        officerBRank: infoB.rank,
        officerBPic: infoB.profileImage,
      };
    });

    // Sort by latest message time
    enrichedConversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json({ success: true, count: enrichedConversations.length, conversations: enrichedConversations });
  } catch (error) {
    console.error(`[GET Admin Conversations Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve conversation logs.' });
  }
});

// @desc    Get messages between two specific officers for Admin oversight
// @route   GET /api/chat/admin/messages
// @access  Private (Admin Commander only)
router.get('/admin/messages', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { officerA, officerB, search } = req.query;
    if (!officerA || !officerB) {
      return res.status(400).json({ success: false, message: 'Both Officer parameters required.' });
    }

    const isDbOffline = mongoose.connection.readyState !== 1;
    let messages = [];

    if (isDbOffline) {
      messages = mockDb.messages.filter(m => 
        (m.sender === officerA && m.recipient === officerB) ||
        (m.sender === officerB && m.recipient === officerA)
      );
    } else {
      messages = await Message.find({
        $or: [
          { sender: officerA, recipient: officerB },
          { sender: officerB, recipient: officerA }
        ]
      }).sort({ createdAt: 1 });
    }

    if (search) {
      const s = search.toLowerCase();
      messages = messages.filter(m => m.content.toLowerCase().includes(s));
    }

    // Enrich with officer names
    let officersList = [];
    if (isDbOffline) {
      officersList = [...mockDb.officers];
    } else {
      const Officer = mongoose.model('Officer');
      officersList = await Officer.find({});
    }

    const officersMap = officersList.reduce((acc, curr) => {
      acc[curr.officerId] = {
        fullName: curr.fullName,
        rank: curr.rank,
      };
      return acc;
    }, {});

    const enriched = messages.map(msg => {
      const obj = typeof msg.toObject === 'function' ? msg.toObject() : { ...msg };
      const senderInfo = officersMap[obj.sender] || { fullName: 'Unknown', rank: 'Operative' };
      obj.senderName = senderInfo.fullName;
      obj.senderRank = senderInfo.rank;
      return obj;
    });

    res.json({ success: true, count: enriched.length, messages: enriched });
  } catch (error) {
    console.error(`[GET Admin Messages Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to access message matrix.' });
  }
});

// @desc    Delete a message completely
// @route   DELETE /api/chat/admin/messages/:messageId
// @access  Private (Admin Commander only)
router.delete('/admin/messages/:messageId', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { messageId } = req.params;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const idx = mockDb.messages.findIndex(m => m.messageId === messageId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Secure packet message not found.' });
      }
      mockDb.messages.splice(idx, 1);
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: `Deleted chat message [${messageId}] from communication logs. (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });
      return res.json({ success: true, message: 'Chat message deleted successfully.' });
    }

    const message = await Message.findOne({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Secure packet message not found.' });
    }

    await Message.deleteOne({ messageId });
    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action: `Deleted chat message [${messageId}] from communication logs.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: 'Chat message deleted successfully.' });
  } catch (error) {
    console.error(`[DELETE Admin Message Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete message packet.' });
  }
});

// @desc    Archive a chat message
// @route   PUT /api/chat/admin/messages/:messageId/archive
// @access  Private (Admin Commander only)
router.put('/admin/messages/:messageId/archive', protect, authorize('Admin Commander'), async (req, res) => {
  try {
    const { messageId } = req.params;
    const { isArchived } = req.body;
    const isDbOffline = mongoose.connection.readyState !== 1;
    const logId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isDbOffline) {
      const message = mockDb.messages.find(m => m.messageId === messageId);
      if (!message) {
        return res.status(404).json({ success: false, message: 'Secure packet message not found.' });
      }
      message.isArchived = isArchived !== undefined ? isArchived : true;
      mockDb.auditLogs.unshift({
        logId,
        user: `${req.user.fullName} (${req.user.officerId})`,
        module: 'System',
        action: `${message.isArchived ? 'Archived' : 'Restored'} chat message [${messageId}]. (In-Memory)`,
        ipAddress: req.ip || '127.0.0.1',
        createdAt: new Date(),
      });
      return res.json({ success: true, message: `Chat message ${message.isArchived ? 'archived' : 'restored'} successfully.`, messageObj: message });
    }

    const message = await Message.findOne({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Secure packet message not found.' });
    }

    message.isArchived = isArchived !== undefined ? isArchived : true;
    await message.save();

    await AuditLog.create({
      logId,
      user: `${req.user.fullName} (${req.user.officerId})`,
      module: 'System',
      action: `${message.isArchived ? 'Archived' : 'Restored'} chat message [${messageId}].`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json({ success: true, message: `Chat message ${message.isArchived ? 'archived' : 'restored'} successfully.`, messageObj: message });
  } catch (error) {
    console.error(`[PUT Admin Archive Error] ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to toggle message archive state.' });
  }
});

export default router;
