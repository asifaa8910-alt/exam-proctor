import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

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
    const activeUser = user || (req && req.user);
    const email = activeUser ? activeUser.email : 'unknown';
    const name = activeUser ? activeUser.name : 'Unknown User';
    const role = activeUser ? activeUser.role : 'unknown';
    const userIdString = activeUser ? activeUser.id : null;
    const userIdObj = userIdString ? toObjectId(userIdString) : null;

    let ipAddress = 'unknown';
    let userAgent = 'unknown';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown';
      if (ipAddress.includes('::ffff:')) {
        ipAddress = ipAddress.split('::ffff:')[1];
      }
      userAgent = req.headers['user-agent'] || 'unknown';
    }

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

    let cleanedDescription = description;
    if (metadata.password) {
      cleanedDescription = cleanedDescription.replace(metadata.password, '********');
    }
    if (metadata.newPassword) {
      cleanedDescription = cleanedDescription.replace(metadata.newPassword, '********');
    }

    if (mongoose.connection.readyState === 1) {
      if (userIdObj && activeUser) {
        await User.findByIdAndUpdate(
          userIdObj,
          { name, email, role },
          { upsert: true, new: true }
        ).catch(err => console.error('Failed to sync User to MongoDB:', err.message));
      }

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
    } else {
      console.log(`[AuditLog] MongoDB not connected. Skipping remote log for: ${action} by ${email}`);
    }
    console.log(`[AuditLog] Recorded action: ${action} by ${email}`);
  } catch (err) {
    console.error('AuditLog execution failed:', err.message);
  }
}

