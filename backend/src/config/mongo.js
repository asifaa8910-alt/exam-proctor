import mongoose from 'mongoose';

// Disable command buffering globally so mongoose fails fast when disconnected
mongoose.set('bufferCommands', false);

let mongoConnection = null;

export async function connectMongo() {
  if (mongoConnection) return mongoConnection;

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exam_portal';
  try {
    mongoConnection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('🔌 Connected to MongoDB for Audit Logging');
    return mongoConnection;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    return null;
  }
}
