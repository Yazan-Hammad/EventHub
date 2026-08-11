const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  password: { type: String },
  role: { type: String, enum: ['attendee', 'organizer'], default: 'attendee' },
});

module.exports = mongoose.model('User', userSchema);

