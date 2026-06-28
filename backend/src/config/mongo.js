import mongoose from 'mongoose';

let mongoConnection = null;

export async function connectMongo() {
  if (mongoConnection) return mongoConnection;

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exam_portal';
  try {
    mongoConnection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5 seconds connection timeout
    });
    console.log('🔌 Connected to MongoDB for Audit Logging');
    return mongoConnection;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    // Return null instead of crashing the server so the main API stays up
    return null;
  }
}
