const mongoose = require('mongoose');

async function connectToMongo(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }
  const dbName = process.env.MONGO_DB_NAME || undefined;
  await mongoose.connect(uri, dbName ? { dbName } : {});
  // eslint-disable-next-line no-console
  console.log('Auth service connected to MongoDB');
}

module.exports = { mongoose, connectToMongo };
