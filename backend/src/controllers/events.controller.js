const mongoose = require('mongoose');
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const User = require('../models/User');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;

// Parses page/size query params, falling back to defaults for anything missing,
// non-numeric, or <= 0 — using `||` for this would wrongly treat an explicit "0" as unset.
function parsePagination(page, size) {
  const parsedPage = parseInt(page, 10);
  const parsedSize = parseInt(size, 10);

  const pageNum = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const sizeNum = Number.isInteger(parsedSize) && parsedSize > 0
    ? Math.min(parsedSize, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return { pageNum, sizeNum };
}

async function listEvents(req, res) {
  const { q, city, category, page, size } = req.query;

  const { pageNum, sizeNum } = parsePagination(page, size);

  const filter = {};

  if (city) {
    const venuesInCity = await Venue.find({ city: new RegExp(`^${city}$`, 'i') }).select('_id');
    filter.venue = { $in: venuesInCity.map((v) => v._id) };
  }

  if (category) {
    filter.categories = category;
  }

  if (q) {
    filter.$text = { $search: q };
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('venue', 'name city capacity')
      .populate('organizer', 'name email')
      .sort({ startsAt: 1 })
      .skip((pageNum - 1) * sizeNum)
      .limit(sizeNum),
    Event.countDocuments(filter),
  ]);

  res.json({
    data: events,
    page: pageNum,
    size: events.length,
    total,
    totalPages: Math.ceil(total / sizeNum) || 1,
  });
}

async function getEvent(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, `Invalid id: ${id}`);

  const event = await Event.findById(id)
    .populate('venue')
    .populate('organizer', 'name email');

  if (!event) throw new ApiError(404, 'Event not found');

  res.json(event);
}

async function validateEventPayload(body, { partial = false } = {}) {
  const { title, description, startsAt, price, venue, organizer, categories } = body;

  if (!partial || title !== undefined) {
    if (!title || typeof title !== 'string') throw new ApiError(400, 'title is required');
  }
  if (!partial || description !== undefined) {
    if (!description || typeof description !== 'string') throw new ApiError(400, 'description is required');
  }
  if (!partial || startsAt !== undefined) {
    if (!startsAt || Number.isNaN(Date.parse(startsAt))) throw new ApiError(400, 'startsAt must be a valid date');
  }
  if (!partial || price !== undefined) {
    if (price === undefined || typeof price !== 'number' || price < 0) throw new ApiError(400, 'price must be a non-negative number');
  }
  if (!partial || venue !== undefined) {
    if (!venue || !isValidId(venue)) throw new ApiError(400, 'venue must be a valid id');
    const venueExists = await Venue.exists({ _id: venue });
    if (!venueExists) throw new ApiError(400, 'venue does not exist');
  }
  if (!partial || organizer !== undefined) {
    if (!organizer || !isValidId(organizer)) throw new ApiError(400, 'organizer must be a valid id');
    const organizerExists = await User.exists({ _id: organizer });
    if (!organizerExists) throw new ApiError(400, 'organizer does not exist');
  }
  if (categories !== undefined && !Array.isArray(categories)) {
    throw new ApiError(400, 'categories must be an array of strings');
  }
}

async function createEvent(req, res) {
  await validateEventPayload(req.body);
  const { title, description, startsAt, price, venue, organizer, categories = [] } = req.body;

  let event;
  try {
    event = await Event.create({ title, description, startsAt, price, venue, organizer, categories });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'An event with the same title, organizer and start time already exists');
    }
    throw err;
  }
  res.status(201).json(event);
}

async function updateEvent(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, `Invalid id: ${id}`);

  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');

  await validateEventPayload(req.body, { partial: true });

  Object.assign(event, req.body);

  try {
    await event.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'An event with the same title, organizer and start time already exists');
    }
    throw err;
  }

  res.json(event);
}

async function deleteEvent(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, `Invalid id: ${id}`);

  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');

  await Event.deleteOne({ _id: id });
  await Registration.deleteMany({ event: id });

  res.status(204).send();
}

async function registerForEvent(req, res) {
  const { id } = req.params;
  const { userId, ticketCount = 1 } = req.body;

  if (!isValidId(id)) throw new ApiError(400, `Invalid id: ${id}`);
  if (!userId || !isValidId(userId)) throw new ApiError(400, 'userId must be a valid id');
  if (!Number.isInteger(ticketCount) || ticketCount < 1) throw new ApiError(400, 'ticketCount must be a positive integer');

  const event = await Event.findById(id).populate('venue', 'capacity');
  if (!event) throw new ApiError(404, 'Event not found');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, 'userId does not reference an existing user');

  const existingTickets = await Registration.aggregate([
    { $match: { event: event._id } },
    { $group: { _id: null, total: { $sum: '$ticketCount' } } },
  ]);
  const alreadyRegistered = existingTickets[0]?.total || 0;
  const available = event.venue.capacity - alreadyRegistered;

  if (ticketCount > available) {
    if (available <= 0) {
      throw new ApiError(400, 'No tickets left for this event');
    }
    throw new ApiError(400, `Only ${available} ticket(s) left for this event`);
  }

  let registration;
  try {
    registration = await Registration.create({ user: userId, event: id, ticketCount });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'User is already registered for this event');
    throw err;
  }

  res.status(201).json(registration);
}

async function listAttendees(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, `Invalid id: ${id}`);

  const event = await Event.exists({ _id: id });
  if (!event) throw new ApiError(404, 'Event not found');

  const registrations = await Registration.find({ event: id })
    .populate('user', 'name email')
    .sort({ createdAt: 1 });

  res.json(registrations);
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  listAttendees,
};
