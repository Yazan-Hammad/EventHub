const Venue = require('../models/Venue');

async function listVenues(req, res) {
  const venues = await Venue.find().sort({ name: 1 });
  res.json(venues);
}

module.exports = { listVenues };
