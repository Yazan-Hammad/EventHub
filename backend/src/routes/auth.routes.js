const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const { requestOtp, verifyOtp, organizerRegister, organizerLogin, me, logout } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/request-otp', asyncHandler(requestOtp));
router.post('/verify-otp', asyncHandler(verifyOtp));
router.post('/organizer/register', asyncHandler(organizerRegister));
router.post('/organizer/login', asyncHandler(organizerLogin));
router.get('/me', asyncHandler(requireAuth), asyncHandler(me));
router.post('/logout', asyncHandler(requireAuth), asyncHandler(logout));

module.exports = router;

