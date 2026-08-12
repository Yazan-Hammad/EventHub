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

## Authentication

There are now two distinct auth flows in the app:

- **Attendee auth** uses email OTP and is required only for event registration.
- **Organizer auth** uses username/password and is required for organizer login paths.

### Attendee auth (email OTP)

Registering for an event requires a verified email; browsing the event catalog does not.
The attendee flow is passwordless and deliberately lightweight.

- **Plain session token, not JWT.** `Session { token, user, expiresAt }` is stored in MongoDB
  with a TTL index so old sessions expire automatically. A JWT would avoid the collection,
  but this app keeps attendee auth separate from the organizer path and also makes logout
  a real revoke operation (`DELETE` the session) rather than relying on expiration.
- **OTP storage.** Codes are stored as `OtpCode { email, code, attempts, expiresAt }` with
  a TTL index. Requesting a new code removes any previous one for that email, so only the
  latest code can be used. Verifying deletes it immediately, and every verification counts
  toward a 5-attempt cap that invalidates the code on too many failures.
- **Unknown email = signup.** The app creates a `User` automatically when an OTP is
  verified for an email that doesn't already exist. The name defaults to the email's local
  part. This keeps the attendee path simple and avoids a separate registration form.
- **Protected event registration.** `POST /events/:id/register` now accepts only
  `{ ticketCount }` and derives the attendee from `req.user` populated by `requireAuth`.
  The old client-supplied `userId` parameter is no longer trusted.
- **Ethereal email preview.** The dev setup uses Nodemailer `createTestAccount()` so the
  email is sent to a sandboxed preview URL rather than a real inbox. This makes the OTP
  flow testable without requiring actual mail delivery. Switching to a real SMTP provider
  would only require changes in `backend/src/utils/mailer.js`.

### Organizer auth (username/password)

Organizer authentication is separate from attendee OTP auth and is used only for the
organizer login flow.

- **Username/password login.** Organizers sign in with `POST /auth/organizer/login`.
- **Separate auth model.** This path is intentionally distinct because organizer actions
  are different from attendee registration, and the app's current scope doesn't require
  a single unified auth mechanism across both roles.
- **Token-based session.** The organizer login response returns `{ token, user }`, and that
  token is used for authenticated organizer requests.

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

- **Organizer Authentication & 2FA**: Authentication for organizers is distinct and depends on username and password authentication (with JWT). In future work, Two-Factor Authentication (2FA) will be implemented for organizers to bolster security for managing events.
- **Registration Process Optimizations**: Optimizations for the registration process to handle higher concurrency and smoother workflows.
- **Pre-Payment Category**: Add a pre-payment category/status to registrations where paying a portion of the registration cost ensures genuine commitment from users to attend the event.
- **Update & Cancel Registrations**: Add features allowing users to update their registration details or cancel their registration.
- **Conditional Cash Back Policy**: Cancelling a registration will not guarantee a cash back / refund unless it has not affected the full capacity of the event.
- **Waitlist Cancellation Email Notifications**: When someone confirms a cancellation, automatically send an email to all users on the waiting list announcing that $X$ tickets are now available.
- **Additional Event Filters**: Filter events by price range and organizer.
- **Media Support**: Enable uploading and displaying photos and videos for events and venues/places.
- **Reviews & Ratings System**: Enable users to post reviews and ratings for organizers, events, or places.
- A dedicated "edit event" screen in the frontend (the API supports `PUT`, the UI doesn't
  yet expose it).
- A few automated tests for the trickier business rules: capacity enforcement, duplicate
  registration, and cascade delete on event removal.
- Rate-limit `POST /auth/request-otp` per email/IP — right now nothing stops someone from
  spamming an inbox with repeated code requests.
- Gate event creation's organizer field on the logged-in user too, once there's a reason to
  (see the scope boundary note above).
- Swagger Documentation.

