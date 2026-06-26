import jwt from 'jsonwebtoken';

export const JWT_SECRET = 'super-secret-exam-proctor-key';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function isExaminer(req, res, next) {
  if (!req.user || req.user.role !== 'examiner') {
    return res.status(403).json({ error: 'Examiner access required' });
  }
  next();
}

export function isSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
}

export function isStaff(req, res, next) {
  if (!req.user || (req.user.role !== 'examiner' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}
