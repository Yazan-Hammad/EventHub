const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { listUsers } = require('../controllers/users.controller');

const router = express.Router();

router.get('/', asyncHandler(listUsers));

module.exports = router;
