const express = require('express');
const eventsRoutes = require('./events.routes');
const venuesRoutes = require('./venues.routes');
const usersRoutes = require('./users.routes');
const statsRoutes = require('./stats.routes');

// Mounted at /api/v1 in app.js — bump to /v2 there if a breaking change is ever needed.
const router = express.Router();

router.use('/events', eventsRoutes);
router.use('/venues', venuesRoutes);
router.use('/users', usersRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
