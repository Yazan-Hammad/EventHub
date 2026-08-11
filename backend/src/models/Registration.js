const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketCount: { type: Number, required: true, min: 1, default: 1 },
  // 'waitlisted' when the event was already at capacity at registration time —
  // see registerForEvent in events.controller.js.
  status: { type: String, enum: ['confirmed', 'waitlisted'], default: 'confirmed' },
  createdAt: { type: Date, default: Date.now },
});

// One user can only register once per event; enforced at the MongoDB level.
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
