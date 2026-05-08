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
- If you want to deploy separately, point the frontend to your API host and update the proxy as needed.
