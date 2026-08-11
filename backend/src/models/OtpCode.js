const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

otpCodeSchema.index({ email: 1 });
// TTL index: MongoDB deletes the document once expiresAt is in the past — no cron needed.
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpCode', otpCodeSchema);
