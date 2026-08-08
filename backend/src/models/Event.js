const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  startsAt: { type: Date, required: true },
  price: { type: Number, required: true, min: 0 },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categories: { type: [String], default: [] },
});

// Text index powers the `q` search across title + description (see NOTES.md).
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ categories: 1 });

// Same organizer can't create two events with the same title at the same start time.
eventSchema.index({ title: 1, organizer: 1, startsAt: 1 }, { unique: true });

module.exports = mongoose.model('Event', eventSchema);
