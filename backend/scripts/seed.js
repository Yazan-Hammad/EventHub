require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Venue = require('../src/models/Venue');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
  ]);

  const users = await User.insertMany([
    { name: 'Ava Thompson', email: 'ava@example.com' },
    { name: 'Liam Chen', email: 'liam@example.com' },
    { name: 'Sofia Rossi', email: 'sofia@example.com' },
    { name: 'Noah Patel', email: 'noah@example.com' },
    { name: 'Maya Johnson', email: 'maya@example.com' },
  ]);

  const venues = await Venue.insertMany([
    { name: 'Riverside Hall', city: 'Austin', address: '100 River St', capacity: 3 },
    { name: 'Downtown Convention Center', city: 'Austin', address: '500 Main St', capacity: 500 },
    { name: 'The Loft', city: 'Denver', address: '22 Blake St', capacity: 50 },
    { name: 'Grand Pavilion', city: 'Seattle', address: '9 Pike Pl', capacity: 200 },
  ]);

  const [riverside, downtown, loft, pavilion] = venues;
  const [ava, liam, sofia, noah, maya] = users;

  const events = await Event.insertMany([
    {
      title: 'Node.js Deep Dive Workshop',
      description: 'Hands-on workshop covering Express, MongoDB and building real APIs.',
      startsAt: new Date('2026-09-10T18:00:00Z'),
      price: 25,
      venue: riverside._id,
      organizer: ava._id,
      categories: ['tech', 'workshop'],
    },
    {
      title: 'Austin Tech Meetup',
      description: 'Monthly meetup for developers to network and share what they are building.',
      startsAt: new Date('2026-08-20T23:00:00Z'),
      price: 0,
      venue: downtown._id,
      organizer: liam._id,
      categories: ['tech', 'networking'],
    },
    {
      title: 'Vue 3 & Composition API',
      description: 'An evening exploring Vue 3, the Composition API, and Vite tooling.',
      startsAt: new Date('2026-09-05T17:30:00Z'),
      price: 15,
      venue: downtown._id,
      organizer: sofia._id,
      categories: ['tech', 'frontend'],
    },
    {
      title: 'Denver Jazz Night',
      description: 'Live jazz performances from local artists in an intimate venue.',
      startsAt: new Date('2026-08-30T02:00:00Z'),
      price: 20,
      venue: loft._id,
      organizer: noah._id,
      categories: ['music'],
    },
    {
      title: 'Seattle Food & Wine Festival',
      description: 'A celebration of Pacific Northwest cuisine, wine tasting and live cooking demos.',
      startsAt: new Date('2026-09-15T19:00:00Z'),
      price: 40,
      venue: pavilion._id,
      organizer: maya._id,
      categories: ['food', 'festival'],
    },
    {
      title: 'Startup Pitch Night',
      description: 'Local founders pitch their startups to a panel of investors and the community.',
      startsAt: new Date('2026-09-01T23:30:00Z'),
      price: 10,
      venue: pavilion._id,
      organizer: ava._id,
      categories: ['business', 'networking'],
    },
  ]);

  await Registration.insertMany([
    { user: liam._id, event: events[0]._id, ticketCount: 1 },
    { user: sofia._id, event: events[0]._id, ticketCount: 1 },
    { user: noah._id, event: events[1]._id, ticketCount: 2 },
    { user: maya._id, event: events[1]._id, ticketCount: 1 },
    { user: ava._id, event: events[2]._id, ticketCount: 1 },
    { user: liam._id, event: events[3]._id, ticketCount: 1 },
    { user: maya._id, event: events[4]._id, ticketCount: 3 },
    { user: noah._id, event: events[5]._id, ticketCount: 1 },
    { user: sofia._id, event: events[5]._id, ticketCount: 1 },
  ]);

  console.log(`Seeded ${users.length} users, ${venues.length} venues, ${events.length} events.`);
  console.log('Riverside Hall event (capacity 3) has 2 tickets already registered — good for testing the capacity limit.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
