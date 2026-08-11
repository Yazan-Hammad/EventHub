const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Venue = require('./models/Venue');
const Event = require('./models/Event');
const Registration = require('./models/Registration');

// Clears the four collections and inserts known demo data. Shared by the
// standalone `npm run seed` script and the server's auto-seed-if-empty check.
async function seedDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Event.deleteMany({}),
    Registration.deleteMany({}),
  ]);

  const defaultPassword = await bcrypt.hash('12345', 10);

  const users = await User.insertMany([
    { name: 'Ava Thompson', email: 'ava@example.com', username: 'ava', password: defaultPassword, role: 'organizer' },
    { name: 'Liam Chen', email: 'liam@example.com', username: 'liam', password: defaultPassword, role: 'organizer' },
    { name: 'Sofia Rossi', email: 'sofia@example.com', username: 'sofia', password: defaultPassword, role: 'organizer' },
    { name: 'Noah Patel', email: 'noah@example.com', username: 'noah', password: defaultPassword, role: 'organizer' },
    { name: 'Maya Johnson', email: 'maya@example.com', username: 'maya', password: defaultPassword, role: 'organizer' },
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
    // Riverside Hall (capacity 3): filled to capacity, plus one waitlisted, so the
    // waitlist feature is visible immediately. Maya is deliberately left unregistered
    // for this event so you can log in as her and register to see yourself land at
    // waitlist position 2.
    { user: liam._id, event: events[0]._id, ticketCount: 1, status: 'confirmed' },
    { user: sofia._id, event: events[0]._id, ticketCount: 1, status: 'confirmed' },
    { user: ava._id, event: events[0]._id, ticketCount: 1, status: 'confirmed' },
    { user: noah._id, event: events[0]._id, ticketCount: 1, status: 'waitlisted' },

    { user: noah._id, event: events[1]._id, ticketCount: 2, status: 'confirmed' },
    { user: maya._id, event: events[1]._id, ticketCount: 1, status: 'confirmed' },
    { user: ava._id, event: events[2]._id, ticketCount: 1, status: 'confirmed' },
    { user: liam._id, event: events[3]._id, ticketCount: 1, status: 'confirmed' },
    { user: maya._id, event: events[4]._id, ticketCount: 3, status: 'confirmed' },
    { user: noah._id, event: events[5]._id, ticketCount: 1, status: 'confirmed' },
    { user: sofia._id, event: events[5]._id, ticketCount: 1, status: 'confirmed' },
  ]);

  console.log(`Seeded ${users.length} users, ${venues.length} venues, ${events.length} events.`);
  console.log('Riverside Hall event (capacity 3) is full (3 confirmed) with 1 waitlisted — good for testing the waitlist feature.');
}

// Only seeds if the database looks empty — safe to call on every server startup.
async function seedIfEmpty() {
  const existing = await User.estimatedDocumentCount();
  if (existing > 0) {
    console.log('Database already has data, skipping auto-seed.');
    return;
  }
  console.log('Database is empty, running auto-seed...');
  await seedDatabase();
}

module.exports = { seedDatabase, seedIfEmpty };
