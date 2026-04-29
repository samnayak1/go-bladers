import express from "express";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { AuthRequest } from "../middleware/auth.middleware";
import { verifyToken } from "../middleware/auth.middleware";
import User from "../models/user.model";
import Stream from "../models/stream.model";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import path from "path";
import { createReadStream, existsSync } from "fs";
import { readFile } from "fs/promises";
import { uploadStreamToStorage } from "../services/storage.service";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../configs/storageBucket";

const router = express.Router();

let cognitoClient: CognitoIdentityProviderClient;
let clientId: string;
let clientSecret: string;
let bucketName:string;

export const initAuthRouter = (
  region: string,
  cognitoClientId: string,
  cognitoClientSecret: string,
  s3Bucket: string
) => {
  cognitoClient = new CognitoIdentityProviderClient({ region });
  clientId = cognitoClientId;
  clientSecret = cognitoClientSecret;
  bucketName = s3Bucket;
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
      isVerified: false,
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

    await User.findOneAndUpdate({ email }, { isVerified: true });

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
router.post("/publish", async (req, res) => {

  /**{
express-app  |   app: 'stream',
express-app  |   flashver: 'FMLE/3.0 (compatible; FMSc/1.0)',
express-app  |   swfurl: 'rtmp://localhost:1935/stream',
express-app  |   tcurl: 'rtmp://localhost:1935/stream',
express-app  |   pageurl: '',
express-app  |   addr: '172.18.0.1',
express-app  |   clientid: '8',
express-app  |   call: 'publish',
express-app  |   name: '4a56b1099281a28beb011704eaa219b9',
express-app  |   type: 'live'
express-app  | } */
    console.log("PUBLISH BODY:", req.body);
    console.log("FULL BODY:", JSON.stringify(req.body));

    const { name } = req.body;

  


    
    const user = await User.findOne({ streamKey: name });
    if (!user) return res.sendStatus(403);
    if (user.isLive) return res.sendStatus(403);


 await Stream.create({
    name: `${user.username}'s stream ${Math.random().toString(16).substring(2, 8)}`,
    streamKey: name,
    userId: user._id,
    isLive: true,
  });


  // // Mark as live
  await User.findOneAndUpdate({ streamKey: name }, { isLive: true });


  
    return res.sendStatus(200);
  });


  router.post("/publish-done",async (req, res) => {
    const { name } = req.body;
  await User.findOneAndUpdate({ streamKey: name }, { isLive: false });

  const stream = await Stream.findOne({ streamKey: name, isLive: true });

  if (stream) {
    const duration = Math.floor((Date.now() - stream.createdAt.getTime()) / 1000);
    await Stream.findByIdAndUpdate(stream._id, {
      isLive: false,
      endedAt: new Date(),
      duration,
    });

   await uploadStreamToStorage(name, stream._id.toString()).catch(err =>
      console.error("S3 upload error:", err)
    );
  }
    console.log("Publish done callback received:",req.body);  
    
    /*{
express-app  |   app: 'hls',
express-app  |   flashver: 'FMLE/3.0 (compatible; Lavf59.27',
express-app  |   swfurl: '',
express-app  |   tcurl: 'rtmp://localhost:1935/hls',
express-app  |   pageurl: '',
express-app  |   addr: '127.0.0.1',
express-app  |   clientid: '11',
express-app  |   call: 'done',
express-app  |   name: '4a56b1099281a28beb011704eaa219b9_720p2628kbs/ '4a56b1099281a28beb011704eaa219b9_480p1128kbs/'4a56b1099281a28beb011704eaa219b9_360p878kbs'
express-app  | }* */
    return res.sendStatus(200);
  });

   router.post("/play",async (req, res) => {
    console.log("auth play done callback received:",req.body);     
    return res.sendStatus(200);
  });

   router.post("/done",async (req, res) => {
    console.log("done play done callback received:",req.body);     
    return res.sendStatus(200);
  });

const HLS_PATH = "/opt/data/hls";

// Serve m3u8 playlist
router.get("/:username/:variant/index.m3u8", async (req, res) => {
  const { username, variant } = req.params;
console.log("Watch request for:", username);
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Replace username with streamKey to find actual folder
    const actualVariant = variant.replace(new RegExp(username, "g"), user.streamKey);
    const m3u8Path = path.join(HLS_PATH, actualVariant, "index.m3u8");

    console.log("Looking for variant at:", m3u8Path);

    if (!existsSync(m3u8Path)) {
      return res.status(404).json({ error: "Variant not found" });
    }

    let content = await readFile(m3u8Path, "utf-8");
    content = content.replace(new RegExp(user.streamKey, "g"), username);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/:username/:variant/:segment", async (req, res) => {
  const { username, variant, segment } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const actualVariant = variant.replace(new RegExp(username, "g"), user.streamKey);
    const segmentPath = path.join(HLS_PATH, actualVariant, segment);

    console.log("Looking for segment at:", segmentPath);

    if (!existsSync(segmentPath)) {
      return res.status(404).json({ error: "Segment not found" });
    }

    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    createReadStream(segmentPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/:username/index.m3u8", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });
  //  if (!user.isLive) return res.status(404).json({ error: "Stream not live" });

    const m3u8Path = path.join(HLS_PATH, `${user.streamKey}.m3u8`);

    if (!existsSync(m3u8Path)) {
      return res.status(404).json({ error: "Stream not ready" });
    }

    let content = await readFile(m3u8Path, "utf-8");
    content = content.replace(new RegExp(user.streamKey, "g"), username);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch (err) {
    console.error("Master playlist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Serve .ts segments
router.get("/:username/:segment", async (req, res) => {
  const { username, segment } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Replace username back to streamKey to find the actual file
    const actualSegment = segment.replace(new RegExp(username, "g"), user.streamKey);
    const segmentPath = path.join(HLS_PATH, actualSegment);

    if (!existsSync(segmentPath)) {
      return res.status(404).json({ error: "Segment not found" });
    }

    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    createReadStream(segmentPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const streams = await Stream.find({
      userId: user._id,
      isLive: false,
      recordingKey: { $ne: null },
    }).sort({ createdAt: -1 });

    res.json(streams.map(s => ({
      id: s._id,
      name: s.name,
      createdAt: s.createdAt,
      endedAt: s.endedAt,
      duration: s.duration,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get master playlist for a past stream
router.get("/replay/:username/:streamId/index.m3u8", async (req, res) => {
  const { username, streamId } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const stream = await Stream.findOne({ _id: streamId, userId: user._id });
    if (!stream?.recordingKey) {
      return res.status(404).json({ error: "Recording not found" });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `${stream.recordingKey}/${stream.streamKey}.m3u8`,
    });

    const response = await s3.send(command);
    let content = await response.Body?.transformToString() ?? "";
    if (!content) return res.status(404).json({ error: "Recording not found" });

    // Replace streamKey with streamId only
    content = content.replace(new RegExp(stream.streamKey, "g"), streamId);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch (err) {
    console.error("Replay master playlist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get variant playlist
router.get("/replay/:username/:streamId/:variant/index.m3u8", async (req, res) => {
  const { username, streamId, variant } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const stream = await Stream.findOne({ _id: streamId, userId: user._id });
    if (!stream?.recordingKey) {
      return res.status(404).json({ error: "Recording not found" });
    }

    // Replace streamId back to streamKey to find S3 file
    const actualVariant = variant.replace(new RegExp(streamId, "g"), stream.streamKey);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `${stream.recordingKey}/${actualVariant}/index.m3u8`,
    });

    const response = await s3.send(command);
    let content = await response.Body?.transformToString() ?? "";
    if (!content) return res.status(404).json({ error: "Recording not found" });

    // Replace streamKey with streamId in segment URLs
    content = content.replace(new RegExp(stream.streamKey, "g"), streamId);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(content);
  } catch (err) {
    console.error("Replay variant playlist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve .ts segments from S3
router.get("/replay/:username/:streamId/:variant/:segment", async (req, res) => {
  const { username, streamId, variant, segment } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const stream = await Stream.findOne({ _id: streamId, userId: user._id });
    if (!stream?.recordingKey) {
      return res.status(404).json({ error: "Recording not found" });
    }

    // Replace streamId back to streamKey to find S3 file
    const actualVariant = variant.replace(new RegExp(streamId, "g"), stream.streamKey);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `${stream.recordingKey}/${actualVariant}/${segment}`,
    });

    const response = await s3.send(command);

    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const body = response.Body as any;
    body.pipe(res);
  } catch (err) {
    console.error("Replay segment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



//TODO: put everything ni services
const generateSecretHash = (username: string, clientId: string, clientSecret: string) => {
  return crypto
    .createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
};

export default router;