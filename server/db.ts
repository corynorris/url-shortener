import mongoose from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/url-shortener";

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
    connected = false;
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
    connected = false;
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    connected = true;
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    connected = false;
    throw err;
  }
}

export function isConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}
