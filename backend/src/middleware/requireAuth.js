const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');

// Attaches req.user and req.sessionToken from a valid `Authorization: Bearer <token>`
// header. The registering user is always taken from this verified session, never
// from a client-supplied id in the request body.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) throw new ApiError(401, 'Not authenticated');

  const session = await Session.findOne({ token }).populate('user');
  if (!session || session.expiresAt < new Date()) {
    throw new ApiError(401, 'Session expired — please log in again');
  }

  req.user = session.user;
  req.sessionToken = token;
  next();
}

module.exports = requireAuth;
