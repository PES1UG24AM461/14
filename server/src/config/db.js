import mongoose from 'mongoose';

export async function connectDB(uri) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.'
    );
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}
