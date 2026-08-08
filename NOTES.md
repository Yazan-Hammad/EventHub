# Notes

## Why each relationship is modeled the way it is

- **Event → Venue, Event → User (organizer)**: stored as ObjectId references on the Event
  document, as specified. A venue/user can have many events, so the "many" side (Event)
  holds the foreign key — the standard way to model one-to-many in MongoDB without
  duplicating data.
- **User ↔ Event (attendance)**: this is many-to-many (a user attends many events, an event
  has many attendees), so it gets its own `Registration` collection rather than an array on
  either side. An array of attendee ids on Event would make "how many events has this user
  registered for" an expensive collection scan, and would make enforcing "one registration
  per user per event" much harder. The compound unique index `{ user: 1, event: 1 }` on
  Registration enforces that constraint at the database level (a duplicate insert throws
  Mongo error `11000`, which the API maps to `409`), rather than relying on an
  application-level check that could race under concurrent requests.
- **No capacity field on Event**: capacity belongs to the venue, not the event, so `Event`
  stays without one and the register endpoint follows the `venue` reference to read
  `capacity` and compares it against the sum of existing `ticketCount` values for that
  event.
- **Cascade delete**: `DELETE /api/events/:id` deletes the event and then removes its
  registrations in the same request handler (`Registration.deleteMany({ event: id })`).
  This is an application-level cascade rather than a MongoDB transaction — simple, and
  sufficient for a single write path with no other writers touching the same event
  concurrently in this app.

## Text search

`GET /api/events?q=...` uses a MongoDB **text index** on `title` and `description`
(`eventSchema.index({ title: 'text', description: 'text' })`), queried with
`{ $text: { $search: q } }`. This was chosen over a regex-based search because it's built
into MongoDB (no extra infrastructure), handles multi-word queries and stemming
out-of-the-box, and can rank by relevance if needed later — regex `LIKE`-style matching
can't do any of that. Elasticsearch would be the natural next step for typo tolerance and
highlighting, but that's explicitly extra credit in the task and wasn't attempted here.

## What I'd improve with more time

- A dedicated "edit event" screen in the frontend (the API supports `PUT`, the UI doesn't
  yet expose it).
- Server-side request validation with a schema library (e.g. Zod or Joi) instead of the
  hand-rolled checks in the controllers — fine at this size, but would get repetitive if the
  API grew.
- A few automated tests for the trickier business rules: capacity enforcement, duplicate
  registration, and cascade delete on event removal.
- Debounced search-as-you-type on the events list instead of a submit button.
