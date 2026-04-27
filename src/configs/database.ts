import mongoose from "mongoose";


interface DatabaseStrategy {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}


class MongoDBStrategy implements DatabaseStrategy {
  private uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }

  async connect(): Promise<void> {
    try {
      await mongoose.connect(this.uri);
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}


class Database {
  private strategy: DatabaseStrategy;

  constructor(strategy: DatabaseStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: DatabaseStrategy) {
    this.strategy = strategy;
  }

  async connect(): Promise<void> {
    await this.strategy.connect();
  }

  async disconnect(): Promise<void> {
    await this.strategy.disconnect();
  }
}


export default Database;
export { MongoDBStrategy };

