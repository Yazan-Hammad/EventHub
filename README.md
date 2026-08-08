# EventHub

A small events app. Organizers publish events at venues, and people register to attend.
Built with Node.js + Express + MongoDB (Mongoose) on the backend and Vue 3 + Vite on the
frontend. There is no login — a "logged in as" dropdown in the navbar lets you pick which
seeded user you're acting as.

## Requirements

- Node.js 18+ (developed and tested on Node v18.16.0, npm 9.5.1)
- A MongoDB database — either a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
  or a local MongoDB (e.g. via `docker run -d -p 27017:27017 mongo:7`)

## 1. Start MongoDB

**Option A — Atlas (cloud):** create a free cluster, a database user, and add your IP (or
`0.0.0.0/0` for simplicity during development) under Network Access. Copy the
`mongodb+srv://...` connection string.

**Option B — local via Docker:**
```bash
docker run -d --name eventhub-mongo -p 27017:27017 mongo:7
```
Then use `MONGODB_URI=mongodb://localhost:27017/eventhub`.

## 2. Environment variables

Copy the example files and fill in your own values:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env`:
| Variable | Description |
| --- | --- |
| `MONGODB_URI` | Full MongoDB connection string (Atlas or local) |
| `PORT` | Port the API listens on (default `5000`) |

`frontend/.env`:
| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, including version prefix (default `http://localhost:5000/api/v1`) |

## 3. Install and run the backend

```bash
cd backend
npm install
npm run seed   # populates users, venues, events and a few registrations
npm run dev    # starts the API on http://localhost:5000
```

## 4. Install and run the frontend

```bash
cd frontend
npm install
npm run dev    # starts the app on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Seed data

`backend/scripts/seed.js` clears the four collections and inserts 5 users, 4 venues and 6
events, plus a handful of registrations. One event ("Node.js Deep Dive Workshop") is seeded
at a 3-capacity venue with 2 tickets already taken, so you can immediately test the
capacity-limit rejection by registering one more person.

## API endpoints

All routes are prefixed with `/api/v1`.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/v1/events` | List events. Query params: `q` (text search), `city`, `category`, `page`, `size` |
| GET | `/api/v1/events/:id` | Get one event, with venue, organizer and categories |
| POST | `/api/v1/events` | Create an event |
| PUT | `/api/v1/events/:id` | Update an event |
| DELETE | `/api/v1/events/:id` | Delete an event and its registrations |
| POST | `/api/v1/events/:id/register` | Register a user for an event (`{ userId, ticketCount }`) |
| GET | `/api/v1/events/:id/attendees` | List users registered for an event |
| GET | `/api/v1/venues` | List venues |
| GET | `/api/v1/users` | List users (for the dropdowns) |
| GET | `/api/v1/stats/top-venues` | Top 5 venues by number of registrations (aggregation pipeline) |

Status codes: `400` for bad input (missing/invalid fields, bad ids, event at capacity),
`404` for a missing event/route, `409` for a duplicate registration.

## What's completed

- All four Mongoose models with the relationships as specified (Event references Venue and
  User/organizer; Registration is a separate collection with a compound unique index on
  `user + event`).
- Every listed API endpoint, including the `top-venues` aggregation pipeline.
- Capacity enforcement (looked up via the event's venue), duplicate-registration handling
  (409, backed by the MongoDB unique index), and cascade delete of registrations when an
  event is deleted.
- Search (`q`), city and category filters, and pagination on `GET /api/events`.
- All three Vue pages (events list, event detail, create event) with loading, error and
  empty states, plus the "logged in as" user selector.
- Seed script and this README.

## What's skipped

- Authentication (explicitly out of scope per the task).
- All extra-credit items (Elasticsearch, JWT auth, waitlists, Docker Compose, automated
  tests) — none were attempted, per the task's own recommendation to get the core solid
  first.
- Editing an existing event has a backend endpoint (`PUT /api/events/:id`) but no dedicated
  frontend UI — only creation is wired up in the frontend.

## Known issues

- End-to-end testing against a live database was blocked for part of development by a local
  environment issue on the dev machine: Node's TLS handshake to MongoDB Atlas was being
  interfered with by local security software, and Docker Desktop was slow/unreliable to
  start for a local MongoDB fallback. The code itself does not depend on this — any working
  `MONGODB_URI` should work. If you hit `MongooseServerSelectionError` on Atlas from Node
  specifically (while other tools like `openssl`/browsers connect fine), check for
  antivirus "HTTPS scanning" or a corporate VPN/proxy intercepting TLS.
