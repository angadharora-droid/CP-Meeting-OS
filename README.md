# Meeting OS

A mobile-first meeting management web app built with React, Express, and MongoDB.

## Structure

- `frontend/` React + Vite UI
- `backend/` Express API + Mongoose models
- `docker-compose.yml` local MongoDB container

## Requirements

- Node.js 22+
- MongoDB access by either:
- local MongoDB Community Server installation, or
- MongoDB Atlas (cloud, no Docker needed)

## Setup

1. Choose your MongoDB option.

Option A: MongoDB Atlas (recommended if Docker is not installed)

- Create a free cluster at https://www.mongodb.com/atlas
- Create a database user
- Add your current IP to Network Access
- Copy your connection string and replace `<password>` with the real password

Example URI format:

```bash
mongodb+srv://<username>:<password>@<cluster-url>/meeting_os?retryWrites=true&w=majority
```

Option B: Local MongoDB with Docker Compose

```bash
docker compose up -d
```

2. Configure the backend environment.

Copy `backend/.env.example` to `backend/.env` and set:

```bash
PORT=4000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/meeting_os?retryWrites=true&w=majority
```

If using local MongoDB instead of Atlas, set:

```bash
MONGO_URI=mongodb://localhost:27017/meeting_os
```

3. Install and run the backend.

```bash
cd backend
npm install
npm run dev
```

4. Install and run the frontend.

```bash
cd frontend
npm install
npm run dev
```

The React app proxies `/api` requests to the backend during development.

## Features

- PIN-gated mobile-first UI
- New meeting creation with notice/form generation
- People registry backed by MongoDB
- Meeting bank with open/closed filters
- Action tracker with overdue handling
- Meeting closure flow with action point capture
- Search across meetings, people, and tasks

## Notes

- The frontend uses a local dev proxy to reach the Express API.
- If you deploy the frontend and backend separately, set the frontend host's `VITE_API_URL`
  to the public Meeting OS backend URL, for example `https://your-meeting-os-backend.example.com`.
- On the backend host, set `CORS_ORIGINS` to the browser origins allowed to call the API,
  for example `https://meetingos.centrepointgroup.in`.

## Executive Scheduler link

Executive Scheduler accounts can be linked to Meeting OS accounts (admin and managers only).

- **Action points into its inbox.** The Scheduler's server reads the action points assigned to a
  linked account (by its name, or by mobile number) from `GET /api/integrations/action-points`,
  and the list of Meeting OS accounts from `GET /api/integrations/people`. Both are read-only
  and need the header `X-Integration-Secret` to equal `MEETING_OS_SECRET` on the backend.
  With `MEETING_OS_SECRET` empty they answer 404.
- **New Meeting from a Scheduler task.** The Scheduler opens
  `/new-meeting?title=&date=yyyy-mm-dd&time=HH:MM&minutes=&unit=` to fill the form. With
  `embed=scheduler&parent=<scheduler origin>` added it shows the page inside its own dialog,
  without Meeting OS's header and menus, and is told (`postMessage`, type `meeting-os:saved`)
  when the meeting is saved. The portal sign-in works inside that dialog when the Scheduler is
  served under `centrepointgroup.in`; otherwise the PIN screen shows there.

Set `MEETING_OS_SECRET` to the same long random value on this backend and on the Scheduler.
