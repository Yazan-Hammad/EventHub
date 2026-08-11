const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const JWT_SECRET = process.env.JWT_SECRET || 'eventhub-secret-key-123';

// Attaches req.user and req.sessionToken from a valid `Authorization: Bearer <token>`
// header. Supports both JWT tokens (organizers/JWT users) and Session tokens (OTP attendees).
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) throw new ApiError(401, 'Not authenticated');

  // 1. Try JWT verification first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.sessionToken = token;
      return next();
    }
  } catch (err) {
    // Not a valid JWT, fallback to DB Session lookup below
  }

  // 2. Fallback to DB Session lookup (for OTP attendees)
  const session = await Session.findOne({ token }).populate('user');
  if (!session || session.expiresAt < new Date()) {
    throw new ApiError(401, 'Session expired — please log in again');
  }

  req.user = session.user;
  req.sessionToken = token;
  next();
}

function requireOrganizer(req, res, next) {
  if (!req.user || req.user.role !== 'organizer') {
    throw new ApiError(403, 'Forbidden: Organizer access required');
  }
  next();
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireOrganizer = requireOrganizer;

