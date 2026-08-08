const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { listVenues } = require('../controllers/venues.controller');

const router = express.Router();

router.get('/', asyncHandler(listVenues));

module.exports = router;
