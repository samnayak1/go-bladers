import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import {  initCognito } from "./middleware/auth.middleware";
import { getSecrets } from "./configs/secrets";
import Database, { MongoDBStrategy } from "./configs/database";
import cors from "cors";
  import swaggerUi from "swagger-ui-express";

import authRouter from "./routes/auth.route"
import streamRouter from "./routes/stream.route"
import userRouter from "./routes/user.route"
import { swaggerSpec } from "./configs/swagger";
import { StreamCleanupService } from "./services/implementations/streamCleanup.service";
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,  // allow cookies if needed
}));

const fetchSecretsThenStartInitModule = async () => {
  console.log("Starting bootstrap...");
  const secrets = await getSecrets();

 console.log("Secrets fetched");
  const db = new Database(new MongoDBStrategy(secrets.MONGODB_URI));
  await db.connect();
    console.log("DB connected");

    
  // we use aws incognito for storing secrets
  initCognito(secrets.COGNITO_USER_POOL_ID, secrets.COGNITO_CLIENT_ID);
  console.log("Cognito initialized");


  console.log("Mounting routes...");
  app.use("/auth", authRouter);
  app.use("/stream", streamRouter);
  app.use("/user",userRouter);

//running clean up service
const cleanupService = new StreamCleanupService();
cleanupService.start(5000) //5 seconds



app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const PORT = process.env.PORT!;

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


};

fetchSecretsThenStartInitModule();