require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectToMongo } = require('./db');
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  await connectToMongo(MONGO_URI);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter);
  app.use('/auth', authRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'Not found' });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
