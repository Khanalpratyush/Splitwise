import mongoose from 'mongoose';
import logger from '@/utils/logger';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  let mongoose: MongooseConnection | undefined;
}

const cached: MongooseConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    logger.info('Creating new database connection');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        logger.info('Successfully connected to MongoDB');
        return mongoose;
      })
      .catch((error) => {
        logger.error('Error connecting to MongoDB', error);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB; 