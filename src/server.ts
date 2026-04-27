import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import {  initCognito } from "./middleware/auth.middleware";
import { getSecrets } from "./configs/secrets";
import Database, { MongoDBStrategy } from "./configs/database";

import { initAuthRouter } from "./routes/auth.route";
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
  const authRouter = initAuthRouter(
    process.env.AWS_REGION!,
    secrets.COGNITO_CLIENT_ID,
    secrets.COGNITO_CLIENT_SECRET
  );
  app.use("/auth", authRouter);


  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


};

fetchSecretsThenStartInitModule();