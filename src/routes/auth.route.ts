import express from "express";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { AuthRequest } from "../middleware/auth.middleware";
import { verifyToken } from "../middleware/auth.middleware";
import User from "../models/user";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";

const router = express.Router();

let cognitoClient: CognitoIdentityProviderClient;
let clientId: string;
let clientSecret: string;

export const initAuthRouter = (
  region: string,
  cognitoClientId: string,
  cognitoClientSecret: string
) => {
  cognitoClient = new CognitoIdentityProviderClient({ region });
  clientId = cognitoClientId;
  clientSecret = cognitoClientSecret;
  return router;
};


router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
 
   await cognitoClient.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: email,
        Password: password,
        SecretHash: generateSecretHash(email, clientId, clientSecret),
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "preferred_username", Value: username },
        ],
      })
    );

    const user = new User({
      username,
      email,
      streamKey: crypto.randomBytes(16).toString("hex"),
    });

    await user.save();

    res.status(201).json({
      message: "User registered. Please check your email to confirm.",
    });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/confirm", async (req, res) => {
  const { email, code } = req.body;

  try {
    await cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: email,
        ConfirmationCode: code,
        SecretHash: generateSecretHash(email, clientId, clientSecret),
      })
    );

    res.json({ message: "Account confirmed. You can now log in." });
  } catch (err: any) {
    console.error("Confirm error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: generateSecretHash(email, clientId, clientSecret)
        },
      })
    );

    const tokens = response.AuthenticationResult;

    res.json({
      accessToken: tokens?.AccessToken,  
      idToken: tokens?.IdToken,
      refreshToken: tokens?.RefreshToken,
      expiresIn: tokens?.ExpiresIn,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(401).json({ error: err.message });
  }
});

// get meee
router.get("/me", verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOne({ email: req.user?.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      username: user.username,
      email: user.email,
      streamKey: user.streamKey,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate stream key
router.post("/stream-key/regenerate", verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: req.user?.email },
      { streamKey: crypto.randomBytes(16).toString("hex") },
      { new: true }
    );
    res.json({ streamKey: user?.streamKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken, accessToken } = req.body;

  try {
    // Decode access token to get the Cognito username (sub)
    const decoded = jwt.decode(accessToken) as JwtPayload;
    const username = decoded?.sub;

    if (!username) {
      return res.status(400).json({ error: "Invalid access token" });
    }

    const response = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          SECRET_HASH: generateSecretHash(username, clientId, clientSecret), // use sub not email
        },
      })
    );

    const tokens = response.AuthenticationResult;

    res.json({
      accessToken: tokens?.AccessToken,
      idToken: tokens?.IdToken,
      expiresIn: tokens?.ExpiresIn,
      expiresAt: new Date(Date.now() + (tokens?.ExpiresIn ?? 3600) * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error("Refresh error:", err);
    res.status(401).json({ error: err.message });
  }
});


  // Public route - nginx-rtmp auth
router.post("/auth/publish", async (req, res) => {
    const { name } = req.body;
    const user = await User.findOne({ streamKey: name });
    if (!user) return res.sendStatus(403);
    return res.sendStatus(200);
  });


  router.post("/auth/publish-done",async (req, res) => {
    console.log("Publish done callback received:",req.body);     
    return res.sendStatus(200);
  });
  
router.post("/auth/publish", (req, res) => {
  console.log("PUBLISH:", req.query);
  console.log("PUBLISH BODY:", req.body);
  res.sendStatus(200);
});



//TODO: put everything ni services
const generateSecretHash = (username: string, clientId: string, clientSecret: string) => {
  return crypto
    .createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
};

export default router;