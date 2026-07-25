import express from "express";

import { verifyToken } from "../middleware/auth.middleware";
import { endStreamHandler,
    getAllStreamsOfUserHandler,
    getLatestStreamsHandler,
    getLiveMasterPlaylist, 
    getLiveSegment,
     getLiveVariantPlaylist,
      
       getReplaySegment,
        getReplayVariantPlaylist, 
        getReplayMasterPlaylist, 
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
    getReplayMasterPlaylist
);

router.get(
    "/replay/:username/:streamId/:variant/index.m3u8", 
    validateUsernameParam,
    validateStreamIdParam,

    getReplayVariantPlaylist
);

router.get(
    "/replay/:username/:streamId/:variant/:segment", 
    validateUsernameParam,
    validateStreamIdParam,
    validateVariantSegment,  
    getReplaySegment
);


router.get("/latest", validatePaginationQuery, getLatestStreamsHandler);


router.get(
    "/:username/index.m3u8", 
    validateUsernameParam,
    getLiveMasterPlaylist
);

router.get(
    "/:username/:variant/index.m3u8", 
    validateUsernameParam,
    getLiveVariantPlaylist
);

router.get(
    "/:username/:variant/:segment", 
    validateUsernameParam,
    getLiveSegment
);





router.get(
    "/:username", 
    validateUsernameParam,
    getAllStreamsOfUserHandler
);

export default router;