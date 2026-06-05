import express from "express";

import { verifyToken } from "../middleware/auth.middleware";
import { endStreamHandler,
    getAllStreamsOfUserHandler,
    getLatestStreamsHandler,
    getLive3u8Hanlder, 
    getLivem3u8SegmentHandler,
     getLivem3u8VariantHandler,
      getReplayedm3u8Handler,
       getReplayedm3u8SegmentHandler,
        getReplayedm3u8VariantHandler, 
        playEndedHandler, playStartedHandler, 
        publishStreamHandler, regenerateStreamKeyHandler } from "../controllers/stream.controller";



import { 
    
    validateUsernameParam,
    validateStreamIdParam,

    validatePaginationQuery,
    validateVariantSegment
} from "./../validators/stream.validator"

const router = express.Router();

router.get("/hello", (_, res) => {
    console.log("Hello world")
    res.send("Hello, World!");
});

router.post("/stream-key/regenerate", verifyToken, regenerateStreamKeyHandler);


router.post("/publish", publishStreamHandler);
router.post("/publish-done", endStreamHandler);
router.post("/play", playStartedHandler);  
router.post("/done", playEndedHandler);    


router.get(
    "/replay/:username/:streamId/index.m3u8", 
    validateUsernameParam,  
    validateStreamIdParam,   
    getReplayedm3u8Handler
);

router.get(
    "/replay/:username/:streamId/:variant/index.m3u8", 
    validateUsernameParam,
    validateStreamIdParam,

    getReplayedm3u8VariantHandler
);

router.get(
    "/replay/:username/:streamId/:variant/:segment", 
    validateUsernameParam,
    validateStreamIdParam,
    validateVariantSegment,  
    getReplayedm3u8SegmentHandler
);


router.get("/latest", validatePaginationQuery, getLatestStreamsHandler);


router.get(
    "/:username/index.m3u8", 
    validateUsernameParam,
    getLive3u8Hanlder
);

router.get(
    "/:username/:variant/index.m3u8", 
    validateUsernameParam,
    getLivem3u8VariantHandler
);

router.get(
    "/:username/:variant/:segment", 
    validateUsernameParam,
    getLivem3u8SegmentHandler
);


router.get(
    "/:username/:segment", 
    validateUsernameParam,
    getLivem3u8SegmentHandler
);


router.get(
    "/:username", 
    validateUsernameParam,
    getAllStreamsOfUserHandler
);

export default router;