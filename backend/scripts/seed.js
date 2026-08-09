require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { seedDatabase } = require('../src/seedData');

async function run() {
  await connectDB();
  await seedDatabase();
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
