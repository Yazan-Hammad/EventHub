const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  listAttendees,
} = require('../controllers/events.controller');

const router = express.Router();

router.get('/', asyncHandler(listEvents));
router.get('/:id', asyncHandler(getEvent));
router.post('/', asyncHandler(createEvent));
router.put('/:id', asyncHandler(updateEvent));
router.delete('/:id', asyncHandler(deleteEvent));
router.post('/:id/register', asyncHandler(requireAuth), asyncHandler(registerForEvent));
router.get('/:id/attendees', asyncHandler(listAttendees));

module.exports = router;
