import express from "express";

import { verifyToken } from "../middleware/auth.middleware";
import { endStreamHandler,getAllStreamsOfUserHandler,getLatestStreamsHandler,getLive3u8Hanlder, getLivem3u8SegmentHandler, getLivem3u8VariantHandler, getReplayedm3u8Handler, getReplayedm3u8SegmentHandler, getReplayedm3u8VariantHandler, getStreamByIdHandler, playEndedHandler, playStartedHandler, publishStreamHandler, regenerateStreamKeyHandler } from "../controllers/stream.controller";




const router = express.Router();


router.post("/stream-key/regenerate", verifyToken, regenerateStreamKeyHandler);



router.post("/publish", publishStreamHandler);
router.post("/publish-done", endStreamHandler);
router.post("/play", playStartedHandler);
router.post("/done", playEndedHandler);


router.get("/replay/:username/:streamId/index.m3u8", getReplayedm3u8Handler);
router.get("/replay/:username/:streamId/:variant/index.m3u8", getReplayedm3u8VariantHandler);
router.get("/replay/:username/:streamId/:variant/:segment", getReplayedm3u8SegmentHandler);
router.get("/one/:streamId",getStreamByIdHandler);

router.get("/:username/index.m3u8", getLive3u8Hanlder);
router.get("/:username/:variant/index.m3u8", getLivem3u8VariantHandler);
router.get("/:username/:variant/:segment", getLivem3u8SegmentHandler);
router.get("/:username/:segment", getLivem3u8SegmentHandler);





// User streams

/**
 * @swagger
 * /stream/latest:
 *   get:
 *     summary: Get latest streams paginated
 *     tags: [Stream]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of streams
 */
router.get("/latest", getLatestStreamsHandler);
router.get("/:username", getAllStreamsOfUserHandler);


export default router;