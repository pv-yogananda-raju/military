import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/miscs');
    console.log(`[*] MongoDB connected to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n[!] DATABASE CONNECTION WARNING: ${error.message}`);
    console.warn(`[*] Express API Server is running in FAULT-TOLERANT MODE.`);
    console.warn(`[*] Please configure a valid MONGO_URI in 'backend/.env' to enable full database operations.\n`);
  }
};

export default connectDB;
