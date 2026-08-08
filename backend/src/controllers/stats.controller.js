const Registration = require('../models/Registration');

// Top 5 venues by number of registrations across all their events.
async function topVenues(req, res) {
  const results = await Registration.aggregate([
    {
      $lookup: {
        from: 'events',
        localField: 'event',
        foreignField: '_id',
        as: 'eventDoc',
      },
    },
    { $unwind: '$eventDoc' },
    {
      $group: {
        _id: '$eventDoc.venue',
        registrations: { $sum: 1 },
        ticketsSold: { $sum: '$ticketCount' },
      },
    },
    { $sort: { registrations: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'venues',
        localField: '_id',
        foreignField: '_id',
        as: 'venue',
      },
    },
    { $unwind: '$venue' },
    {
      $project: {
        _id: 0,
        venue: 1,
        registrations: 1,
        ticketsSold: 1,
      },
    },
  ]);

  res.json(results);
}

module.exports = { topVenues };
