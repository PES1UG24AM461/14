import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// In-memory MongoDB for tests, so neither developers nor CI need a real database.
// Usage in a test file:
//   import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
//   beforeAll(connectTestDB); afterEach(clearTestDB); afterAll(closeTestDB);
let mongod;

export async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function clearTestDB() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export async function closeTestDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
