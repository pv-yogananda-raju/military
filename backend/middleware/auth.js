import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Officer from '../models/Officer.js';
import mockDb from '../config/mockDb.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TACTICAL_MILITARY_SECRET_KEY_2026');

      const isDbOffline = mongoose.connection.readyState !== 1;

      if (isDbOffline) {
        // Fetch from mock database
        const officerRaw = mockDb.officers.find(o => o.officerId === decoded.officerId);
        if (officerRaw) {
          const officer = { ...officerRaw };
          delete officer.passwordHash;
          req.user = officer;
        }
      } else {
        // Fetch from Mongoose MongoDB
        req.user = await Officer.findOne({ officerId: decoded.officerId }).select('-passwordHash');
      }
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authorization failed. Officer profile not found.' });
      }

      next();
    } catch (error) {
      console.error(`[Auth Middleware Error] ${error.message}`);
      return res.status(401).json({ success: false, message: 'Not authorized. Secure token verification failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. No tactical access token provided.' });
  }
};

// Check if user role matches allowed roles for a route
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized. User profile is unauthenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Clearance Violation: Role [${req.user.role}] does not possess clearance for this operation.`,
      });
    }

    next();
  };
};
