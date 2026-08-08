const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { topVenues } = require('../controllers/stats.controller');

const router = express.Router();

router.get('/top-venues', asyncHandler(topVenues));

module.exports = router;
