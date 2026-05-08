const mongoose = require('mongoose');

function withDefaultDatabase(mongoUri) {
  const defaultDbName = process.env.MONGO_DB_NAME || 'meeting_os';
  const parsed = new URL(mongoUri);
  const hasDatabaseName = parsed.pathname && parsed.pathname !== '/';

  if (!hasDatabaseName) {
    parsed.pathname = `/${defaultDbName}`;
  }

  return parsed.toString();
}

async function connectToMongo(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGO_URI is required (e.g. mongodb://localhost:27017/meeting_os)');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(withDefaultDatabase(mongoUri));
  return mongoose.connection;
}

module.exports = {
  mongoose,
  connectToMongo,
  withDefaultDatabase,
};
