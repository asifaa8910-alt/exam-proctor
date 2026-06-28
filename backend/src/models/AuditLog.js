import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userName: { type: String },
  userRole: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String },
  entityId: { type: String },
  description: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
