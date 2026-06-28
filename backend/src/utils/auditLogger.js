import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Helper to convert any string ID into a valid 24-character hexadecimal ObjectId
export function toObjectId(id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  const hash = crypto.createHash('md5').update(String(id)).digest('hex').substring(0, 24);
  return new mongoose.Types.ObjectId(hash);
}

export async function createAuditLog({
  req,
  user,
  action,
  entityType,
  entityId,
  description,
  status = 'success',
  metadata = {}
}) {
  try {
    // 1. Resolve user details
    const activeUser = user || (req && req.user);
    const email = activeUser ? activeUser.email : 'unknown';
    const name = activeUser ? activeUser.name : 'Unknown User';
    const role = activeUser ? activeUser.role : 'unknown';
    const userIdString = activeUser ? activeUser.id : null;
    const userIdObj = userIdString ? toObjectId(userIdString) : null;

    // 2. Resolve request details (IP Address & User Agent)
    let ipAddress = 'unknown';
    let userAgent = 'unknown';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown';
      if (ipAddress.includes('::ffff:')) {
        ipAddress = ipAddress.split('::ffff:')[1];
      }
      userAgent = req.headers['user-agent'] || 'unknown';
    }

    // 3. Mask sensitive information in metadata (like passwords and tokens)
    const cleanedMetadata = { ...metadata };
    const sensitiveKeys = ['password', 'token', 'oldPassword', 'newPassword', 'accessToken', 'refreshToken'];
    const maskSensitive = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          obj[key] = '********';
        } else if (typeof obj[key] === 'object') {
          maskSensitive(obj[key]);
        }
      }
    };
    maskSensitive(cleanedMetadata);

    // Also check description for plain passwords or tokens and mask them
    let cleanedDescription = description;
    if (metadata.password) {
      cleanedDescription = cleanedDescription.replace(metadata.password, '********');
    }
    if (metadata.newPassword) {
      cleanedDescription = cleanedDescription.replace(metadata.newPassword, '********');
    }

    // 4. Upsert User in MongoDB for population/refs to work correctly
    if (userIdObj && activeUser) {
      await User.findByIdAndUpdate(
        userIdObj,
        { name, email, role },
        { upsert: true, new: true }
      ).catch(err => console.error('Failed to sync User to MongoDB:', err.message));
    }

    // 5. Create and save AuditLog document
    const auditLog = new AuditLog({
      userId: userIdObj,
      userName: name,
      userRole: role,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      description: cleanedDescription,
      ipAddress,
      userAgent,
      status,
      metadata: cleanedMetadata
    });

    await auditLog.save();
    console.log(`[AuditLog] Recorded action: ${action} by ${email}`);
  } catch (err) {
    // Never crash the main app if logging fails
    console.error('❌ createAuditLog error:', err.message);
  }
}
