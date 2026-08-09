require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedIfEmpty } = require('./seedData');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => seedIfEmpty())
  .then(() => {
    app.listen(PORT, () => console.log(`EventHub API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start', err);
    process.exit(1);
  });
