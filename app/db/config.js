import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

export async function connectToMongo() {
  try {
    console.log("trying to connect to MongoDB -------");
    await mongoose.connect(MONGO_URI);
    console.log("=====================================");
    console.log("Connected to MongoDB");
    console.log("=====================================");
  } catch (error) {
    console.error("MongoDB Connection Error: ", error);
    process.exit(1);
  }
}
