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
- **Event uniqueness**: a compound unique index on `{ title: 1, organizer: 1, startsAt: 1 }`
  stops the same organizer from accidentally creating the same event twice (e.g. a
  double-submitted form). Same pattern as Registration: enforced in MongoDB so it holds even
  under concurrent requests, mapped to `409` in the `create`/`update` controllers.
- **Waitlist**: rather than a separate collection, a full event is handled with a `status`
  field (`confirmed` | `waitlisted`) directly on `Registration`. Capacity math only sums
  `confirmed` tickets, so a registration that doesn't fit becomes `waitlisted` instead of
  being rejected. The unique `{ user, event }` index still applies regardless of status —
  one registration per person per event, whichever bucket it lands in. A waitlisted
  registration's position is computed on demand (count of earlier waitlisted registrations
  for that event, by `_id` order) rather than stored, since it shifts as other people
  register — storing it would mean re-writing every later entry whenever one is removed.

## Text search

`GET /api/events?q=...` matches a case-insensitive **regex** against `title` and
`description` (`{ $or: [{ title: /.../i }, { description: /.../i }] }`, with user input
escaped so special characters like `+` or `(` can't break or inject into the pattern).

This started as a MongoDB **text index** (`$text: { $search: q }`), which is the more
"proper" full-text tool — it handles multi-word queries, stemming, and relevance ranking out
of the box. It was switched to regex after testing showed the real requirement: a search box
where typing a partial word (e.g. "Aust") should find "Austin Tech Meetup" as you type.
`$text` only matches whole tokens (with stemming for things like plurals), not substrings, so
partial input silently returned nothing. Regex trades away relevance ranking and stemming,
but does the one thing this UI actually needs. Elasticsearch would be the real fix for
typo tolerance and highlighting, but that's explicitly extra credit and wasn't attempted.

## What I'd improve with more time

- Auto-promoting the next waitlisted registration to `confirmed` when a confirmed spot
  frees up. There's no cancel/unregister endpoint in this app yet, so nothing currently
  frees a confirmed spot — this is a natural companion feature once cancellation exists,
  not built speculatively ahead of it.
- A dedicated "edit event" screen in the frontend (the API supports `PUT`, the UI doesn't
  yet expose it).
- Server-side request validation with a schema library (e.g. Zod or Joi) instead of the
  hand-rolled checks in the controllers — fine at this size, but would get repetitive if the
  API grew.
- A few automated tests for the trickier business rules: capacity enforcement, duplicate
  registration, and cascade delete on event removal.
- Debounced search-as-you-type on the events list instead of a submit button.
- Replace the guest/Login-button stand-in with real authentication (the navbar and register
  flow are already gated on "is someone logged in", so swapping in real sessions/JWT later
  is mostly a matter of how `currentUserId` gets set, not a UI rework).
