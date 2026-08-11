# EventHub

## What the app does

EventHub is a small events platform: organizers publish events tied to a venue, and people
browse, search and register to attend. It tracks users, venues, events and registrations,
enforces each venue's capacity when someone registers, and surfaces the top venues by
registration count. Built with Node.js + Express + MongoDB (Mongoose) on the backend and
Vue 3 + Vite on the frontend.

Browsing is open to everyone. Registering requires verifying your email with a one-time
code sent by real email (via Nodemailer) — no password. The navbar defaults to a logged-out
"guest" with a Login button; either it or the register button on an event walks you through
entering your email, receiving a 6-digit code, and entering it. Once verified you stay
logged in app-wide (shown by name in the navbar, with a Logout button) until you log out.

## Run the app (3 steps)

Only requirement: **Docker Desktop** installed and running. No Node.js, no MongoDB
account, no manual setup.

1. Clone the repo and open a terminal in its root folder (where `docker-compose.yml` is).
2. Run:
   ```bash
   docker compose up -d --build
   ```
3. Open **[http://localhost:5173](http://localhost:5173)**.

That's it — the database is automatically seeded with demo data on first boot, so the app
is immediately usable (events, venues, users all populated). To stop everything:

```bash
docker compose down
```

(add `-v` to that command to also wipe the database and start fresh next time.)

<details>
<summary>What just started</summary>

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- MongoDB: `localhost:27017` (a named volume persists data across restarts)

</details>

## Local development (without Docker for backend/frontend)

The Docker setup above is all you need to just run the app. If you'd rather run the
backend/frontend directly with npm instead (for hot reload while making changes), you'll
need Node.js 18+ and npm, plus a MongoDB instance:

```bash
docker compose up -d mongo
```

This starts just the `mongo:7` container on `localhost:27017` with a named volume, so data
survives restarts.

### Environment variables

Copy the example files and fill in your own values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:
| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (defaults to the local Docker container) |
| `PORT` | Port the API listens on (default `5000`) |

`frontend/.env`:
| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, including version prefix (default `http://localhost:5000/api/v1`) |

### Install and run the backend

```bash
cd backend
npm install
npm run seed   # populates users, venues, events and a few registrations
npm run dev    # starts the API on http://localhost:5000
```

### Install and run the frontend

```bash
cd frontend
npm install
npm run dev    # starts the app on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Seed data

`backend/src/seedData.js` clears the four collections and inserts 5 users, 4 venues and 6
events, plus a handful of registrations. One event ("Node.js Deep Dive Workshop") is seeded
at a 3-capacity venue that's already full (3 confirmed registrations) with one person on
the waitlist, so the waitlist feature is visible immediately.

For simplicity in demonstration, all seeded users (`ava`, `liam`, `sofia`, `noah`, `maya`) are set up with **username** equal to their first name and a default password of **`12345`** for Organizer login via JWT. Attendees can also log in passwordlessly using Email-OTP.


It runs in two ways:

- **Automatically** on backend startup, but only if the database is empty (checked via a
  document count) — this is what makes the Docker quick start need zero manual steps, and
  it's a no-op on every later restart since the data already exists.
- **On demand** via `npm run seed` (in `backend/`) — this always clears and reseeds,
  useful for resetting back to a known state during local development.

## API endpoints

All routes are prefixed with `/api/v1`.

| Method | Route                          | Description                                                                      |
| ------ | ------------------------------ | -------------------------------------------------------------------------------- |
| GET    | `/api/v1/events`               | List events. Query params: `q` (text search), `city`, `category`, `page`, `size` |
| GET    | `/api/v1/events/:id`           | Get one event, with venue, organizer and categories                              |
| POST   | `/api/v1/events`               | Create an event                                                                  |
| PUT    | `/api/v1/events/:id`           | Update an event                                                                  |
| DELETE | `/api/v1/events/:id`           | Delete an event and its registrations                                            |
| POST   | `/api/v1/events/:id/register`  | Register the logged-in user (`{ ticketCount }`); requires auth; waitlists if full |
| GET    | `/api/v1/events/:id/attendees` | List users registered for an event                                               |
| GET    | `/api/v1/venues`               | List venues                                                                      |
| GET    | `/api/v1/users`                | List users (for the organizer dropdown)                                          |
| GET    | `/api/v1/stats/top-venues`     | Top 5 venues by number of registrations (aggregation pipeline)                   |
| POST   | `/api/v1/auth/request-otp`     | Send a 6-digit code to an email (`{ email }`)                                    |
| POST   | `/api/v1/auth/verify-otp`      | Verify the code (`{ email, code }`), returns `{ token, user }`                   |
| GET    | `/api/v1/auth/me`              | Current logged-in user; requires auth                                            |
| POST   | `/api/v1/auth/logout`          | Invalidate the current session; requires auth                                    |

"Requires auth" means an `Authorization: Bearer <token>` header from `verify-otp`.

Status codes: `400` for bad input (missing/invalid fields, bad ids, wrong/expired/reused
OTP codes), `401` for a missing/invalid/expired session on an auth-required route, `404`
for a missing event/route, `409` for a duplicate registration or for creating/updating an
event to the same title + organizer + start time as an existing one. Registering for a
full event no longer returns an error — it succeeds with `status: "waitlisted"` instead.

## What's completed

- All four Mongoose models with the relationships as specified (Event references Venue and
  User/organizer; Registration is a separate collection with a compound unique index on
  `user + event`). Event also has a compound unique index on `title + organizer + startsAt`
  to reject accidental duplicate events (409).
- Every listed API endpoint, including the `top-venues` aggregation pipeline.
- Capacity handling as a **waitlist** (extra credit): registering for a full event succeeds
  with `status: "waitlisted"` and a `waitlistPosition` instead of being rejected. Capacity
  is checked against confirmed registrations only. Duplicate-registration handling (409,
  backed by the MongoDB unique index) and cascade delete of registrations when an event is
  deleted are unchanged.
- Search (`q`), city and category filters, and pagination on `GET /api/events` — `size` in
  the response reflects the actual number of items returned (never more than `total`).
- All three Vue pages (events list, event detail, create event) with loading, error and
  empty states.
- **Email-OTP authentication** for registering (extra-ish credit, beyond the base spec):
  guests see a Login button in the navbar; clicking Register on an event walks you through
  entering your email, receiving a real 6-digit code (sent via Nodemailer, viewable through
  a preview link since the dev setup uses Ethereal's fake SMTP rather than a real inbox),
  and entering it. A verified session persists app-wide until you log out, so later
  registrations don't repeat the OTP step. `POST /events/:id/register` now derives the
  registering user from that verified session rather than trusting a client-supplied id.
- Seed script and this README.
- Full-stack `docker-compose.yml` (MongoDB + backend + frontend via nginx), with the
  backend auto-seeding an empty database on first boot — cloning the repo and running
  `docker compose up -d --build` needs no other setup.

Verified end-to-end, both via `npm run dev` against a local Dockerized MongoDB and via the
full `docker-compose` stack: seeding (automatic and on-demand), listing/searching/filtering
events, event detail with venue/organizer/attendees, registering (including waitlisting on
a full event and duplicate-registration 409), the full OTP login flow (request code, read
it from the Ethereal preview link, verify, register, session persists across pages and
skips the OTP step on a second registration, logout clears it), creating an event through
the UI, cascade delete removing a deleted event's registrations, and that restarting the
Docker stack doesn't re-seed or duplicate data.

## What's skipped

- Elasticsearch and JWT-based auth were not attempted, per the task's recommendation to
  get the core solid first (this app's OTP sessions use a plain random token in a
  `Session` collection, not a JWT — kept deliberately distinct from that still-unbuilt
  extra-credit item).
- Automated tests.
- Editing an existing event has a backend endpoint (`PUT /api/events/:id`) but no dedicated
  frontend UI — only creation is wired up in the frontend.
- Auto-promoting waitlisted registrations when a confirmed spot frees up — there's no
  cancel/unregister endpoint yet, so nothing currently frees a spot (see NOTES.md).
- The Create Event page's organizer dropdown is intentionally untouched by this
  authentication work — creating an event still lets you pick any user as organizer, it
  isn't gated by being logged in. Only registering requires a verified session.

## Known issues

- None currently blocking. Ethereal (the fake SMTP dev setup) needs outbound internet
  access to create its test account on first use — if `request-otp` fails in an offline or
  heavily firewalled environment, that's why. Swap `backend/src/utils/mailer.js` for a real
  SMTP provider to send actual email.
