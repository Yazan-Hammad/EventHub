const crypto = require('crypto');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const Session = require('../models/Session');
const ApiError = require('../utils/ApiError');
const { sendOtpEmail } = require('../utils/mailer');

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
    user = await User.create({ name, email: normalizedEmail });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({
    token,
    user: user._id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  res.json({ token, user });
}

async function me(req, res) {
  res.json(req.user);
}

async function logout(req, res) {
  await Session.deleteOne({ token: req.sessionToken });
  res.status(204).send();
}

module.exports = { requestOtp, verifyOtp, me, logout };
