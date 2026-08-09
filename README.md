# EventHub

A small events app. Organizers publish events at venues, and people register to attend.
Built with Node.js + Express + MongoDB (Mongoose) on the backend and Vue 3 + Vite on the
frontend. There is no real authentication yet — the navbar defaults to a logged-out
"guest" with a Login button; clicking it lets you pick which seeded user you're acting as
(shown by name afterwards, with a Logout button). This stands in for the auth mechanism
planned for later.

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
at a 3-capacity venue with 2 tickets already taken, so you can immediately test the
capacity-limit rejection by registering one more person.

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
| POST   | `/api/v1/events/:id/register`  | Register a user for an event (`{ userId, ticketCount }`)                         |
| GET    | `/api/v1/events/:id/attendees` | List users registered for an event                                               |
| GET    | `/api/v1/venues`               | List venues                                                                      |
| GET    | `/api/v1/users`                | List users (for the dropdowns)                                                   |
| GET    | `/api/v1/stats/top-venues`     | Top 5 venues by number of registrations (aggregation pipeline)                   |

Status codes: `400` for bad input (missing/invalid fields, bad ids, event at/over capacity —
the message includes how many tickets are left, or that none are left),
`404` for a missing event/route, `409` for a duplicate registration or for creating/updating
an event to the same title + organizer + start time as an existing one.

## What's completed

- All four Mongoose models with the relationships as specified (Event references Venue and
  User/organizer; Registration is a separate collection with a compound unique index on
  `user + event`). Event also has a compound unique index on `title + organizer + startsAt`
  to reject accidental duplicate events (409).
- Every listed API endpoint, including the `top-venues` aggregation pipeline.
- Capacity enforcement (looked up via the event's venue, with the error message stating how
  many tickets remain), duplicate-registration handling (409, backed by the MongoDB unique
  index), and cascade delete of registrations when an event is deleted.
- Search (`q`), city and category filters, and pagination on `GET /api/events` — `size` in
  the response reflects the actual number of items returned (never more than `total`).
- All three Vue pages (events list, event detail, create event) with loading, error and
  empty states, plus a "logged in as" stand-in for auth: guests see a Login button; picking
  a user shows their name and a Logout button. Registering requires being "logged in". Real
  authentication is intentionally deferred (see Known issues).
- Seed script and this README.
- Full-stack `docker-compose.yml` (MongoDB + backend + frontend via nginx), with the
  backend auto-seeding an empty database on first boot — cloning the repo and running
  `docker compose up -d --build` needs no other setup.

Verified end-to-end, both via `npm run dev` against a local Dockerized MongoDB and via the
full `docker-compose` stack: seeding (automatic and on-demand), listing/searching/filtering
events, event detail with venue/organizer/attendees, registering (including the capacity
rejection and duplicate-registration 409), creating an event through the UI, cascade delete
removing a deleted event's registrations, and that restarting the Docker stack doesn't
re-seed or duplicate data.

## What's skipped

- Authentication (explicitly out of scope per the task).
- Remaining extra-credit items: Elasticsearch, JWT auth, waitlists, and automated tests were
  not attempted, per the task's recommendation to get the core solid first.
- Editing an existing event has a backend endpoint (`PUT /api/events/:id`) but no dedicated
  frontend UI — only creation is wired up in the frontend.

## Known issues

- None currently blocking.
