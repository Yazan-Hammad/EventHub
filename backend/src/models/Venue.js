const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, min: 1 },
});

module.exports = mongoose.model('Venue', venueSchema);
