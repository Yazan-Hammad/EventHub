# Tasks

1- Create database
2- Create Express Layer
3- Create Vue.js Layer
4- Deploye App to Hostinger

5- Create APIs Swagger Documentations
6- Document the usecases, users of the app
7- CI/CD Pipelines

## Create database

### COLLECTION

| COLLECTION   | FIELDS                                                              | Done? |
| ------------ | ------------------------------------------------------------------- | ----- |
| User         | name, email                                                         |       |
| Venue        | name, city, address, capacity                                       |       |
| Event        | title, description, startsAt, price, venue, organizer, categories[] |       |
| Registration | user, event, ticketCount, createdAt                                 |       |

### Relations

venue has many events

user (as organizer) has many events.
Store these as references on the Event document.

event has many categories — a simple array of strings is fine.

Users and events are many-to-many.
Model this with the separate Registration collection, not with an array inside Event.

Add a compound unique index on Registration (user + event) so the same person cannot register twice for the same event. Enforce it in MongoDB, not only in your JavaScript.

Deleting an event must not leave its registrations behind.

An event has no capacity field of its own. Its limit is the capacity of the venue hosting it, so you will need to follow the reference to check it.

One endpoint must use an aggregation pipeline rather than a simple find:
GET /api/stats/top-venues —
the top 5 venues by number of registrations.

## Express (Backend)

The API
Express. Build these routes.

| Method | Route                     | Name           | Does                                                                      | Done? |
| ------ | ------------------------- | -------------- | ------------------------------------------------------------------------- | ----- |
| GET    | /api/events               | List events    | List events, with search and filters                                      |       |
| GET    | /api/events/:id           | Get event      | One event, including venue, organizer and categories in the same response |       |
| POST   | /api/events               | Create event   | Create an event                                                           |       |
| PUT    | /api/events/:id           | Update event   | Update an event                                                           |       |
| DELETE | /api/events/:id           | Delete event   | Delete an event and its registrations                                     |       |
| POST   | /api/events/:id/register  | Register user  | Register a user for an event                                              |       |
| GET    | /api/events/:id/attendees | List attendees | List the users registered for an event                                    |       |
| GET    | /api/venues               | List venues    | List venues                                                               |       |
| GET    | /api/users                | List users     | List users (for the dropdown)                                             |       |
| GET    | /api/stats/top-venues     | Top venues     | Top 5 venues by registrations (aggregation)                               |       |
