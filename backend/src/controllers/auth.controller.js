const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');
const { sendOtpEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'eventhub-secret-key-123';
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function requestOtp(req, res) {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }
  const normalizedEmail = email.trim().toLowerCase();

  const code = generateCode();
  // Replace any existing pending code for this email — only the latest one is valid.
  await OtpCode.deleteMany({ email: normalizedEmail });
  await OtpCode.create({
    email: normalizedEmail,
    code,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const { previewUrl } = await sendOtpEmail(normalizedEmail, code);

  res.json({ message: 'Verification code sent', previewUrl });
}

async function verifyOtp(req, res) {
  const { email, code } = req.body;
  if (!email || typeof email !== 'string') throw new ApiError(400, 'email is required');
  if (!code || typeof code !== 'string') throw new ApiError(400, 'code is required');
  const normalizedEmail = email.trim().toLowerCase();

  const otp = await OtpCode.findOne({ email: normalizedEmail });
  if (!otp) throw new ApiError(400, 'No pending code for this email — request a new one');

  if (otp.expiresAt < new Date()) {
    await OtpCode.deleteOne({ _id: otp._id });
    throw new ApiError(400, 'Code expired — request a new one');
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    await OtpCode.deleteOne({ _id: otp._id });
    throw new ApiError(400, 'Too many incorrect attempts — request a new one');
  }

  if (otp.code !== code.trim()) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, 'Invalid code');
  }

  await OtpCode.deleteOne({ _id: otp._id });

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const name = normalizedEmail.split('@')[0];
    user = await User.create({ name, email: normalizedEmail, role: 'attendee' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({
    token,
    user: user._id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  res.json({ token, user });
}

async function organizerRegister(req, res) {
  const { username, email, password, name } = req.body;
  if (!username || typeof username !== 'string') throw new ApiError(400, 'username is required');
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) throw new ApiError(400, 'valid email is required');
  if (!password || typeof password !== 'string') throw new ApiError(400, 'password is required');
  if (!name || typeof name !== 'string') throw new ApiError(400, 'name is required');

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ $or: [{ username: normalizedUsername }, { email: normalizedEmail }] });
  if (existing) throw new ApiError(409, 'Username or email already in use');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    name: name.trim(),
    role: 'organizer',
  });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user });
}

async function organizerLogin(req, res) {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string') throw new ApiError(400, 'username or email is required');
  if (!password || typeof password !== 'string') throw new ApiError(400, 'password is required');

  const query = username.trim().toLowerCase();
  const user = await User.findOne({ $or: [{ username: query }, { email: query }] });
  if (!user || !user.password) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  const userObj = user.toObject();
  delete userObj.password;

  res.json({ token, user: userObj });
}

async function me(req, res) {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }
  const userObj = typeof req.user.toObject === 'function' ? req.user.toObject() : { ...req.user };
  delete userObj.password;
  res.json(userObj);
}



async function logout(req, res) {
  if (req.sessionToken) {
    await Session.deleteOne({ token: req.sessionToken });
  }
  res.status(204).send();
}

module.exports = { requestOtp, verifyOtp, organizerRegister, organizerLogin, me, logout };

