import { Response, Request } from "express"
import { AuthRequest } from "../middleware/auth.middleware"
import { StreamService } from "../services/implementations/stream.service";
import { UserService } from "../services/implementations/user.service";

import { createReadStream } from "fs";




const streamService = new StreamService();


const userService = new UserService();

const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const regenerateStreamKeyHandler = async (req: AuthRequest, res: Response) => {

    try {

        if (!req.user) {
            return res.status(403)
                .json("user not found");
        }
        const email = req.user?.email;
        const regeneratedStreamKey = await userService.regenerateStreamKey(email);


        return res.status(201)
            .json({
                streamKey: regeneratedStreamKey
            })

    } catch (error: any) {
        return res.status(500)
            .json({ message: "Error regenerating stream key" + error.message })
    }


}

export const publishStreamHandler = async (req: AuthRequest, res: Response) => {

    try {


        const { name } = req.body;


        console.log("Publishing stream at", new Date().toISOString());



        await streamService.startStream(name);


        //TODO: return something meaningful
        return res.status(201)
            .json({ message: "Stream started" })



    } catch (error: any) {

        console.error("an error has occured:", error.message)

        return res.status(500)
            .json({ message: "Error publishing stream" + error.message })

    }


}

export const endStreamHandler = async (req: AuthRequest, res: Response) => {
    //TODO: return something meaningful
    try {
        const { name } = req.body;

        await streamService.endStream(name);

        return res.status(200)
            .json({ message: "stream ended" });


    } catch (error: any) {
        console.log("ERROR: ", error.message);
        return res.status(500)
            .json({ message: "Error publishing stream" + error.message })

    }

}

export const playStartedHandler = async (_req: AuthRequest, res: Response) => {
    try {
        return res.status(200).json({ message: "play started" });
    } catch (error: any) {
        console.error("playStartedHandler error:", error.message);
        return res.status(500).json({ message: "Error: " + error.message });
    }
}

export const playEndedHandler = async (_req: AuthRequest, res: Response) => {
    try {
        return res.status(200).json({ message: "play ended" });
    } catch (error: any) {
        console.error("playEndedHandler error:", error.message);
        return res.status(500).json({ message: "Error: " + error.message });
    }
}

export const getLiveVariantPlaylist = async (req: Request, res: Response) => {
    try {
        const { username, variant } = req.params as { username: string, variant: string };
        const content = await streamService.getVariantPlaylist(variant, username);
        return sendM3u8(res, content);
    } catch (error: any) {
        console.error("getLivem3u8VariantHandler error:", error.message);
        return res.status(500).json({ message: "Error: " + error.message });
    }
}

export const getLiveSegment = async (req: Request, res: Response) => {
    try {
        const { username, variant, segment } = req.params as { username: string, variant: string, segment: string };
        const segmentPath = await streamService.getSegmentPath(variant, segment, username);
        if (!segmentPath) return res.status(404).json({ message: "segment not found" });

        res.setHeader("Content-Type", "video/mp2t");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Access-Control-Allow-Origin", "*");
        createReadStream(segmentPath).pipe(res);
    } catch (error: any) {
        console.error("getLivem3u8SegmentHandler error:", error.message);
        return res.status(500).json({ message: "Error: " + error.message });
    }
}

export const getLiveMasterPlaylist = async (req: Request, res: Response) => {
    try {
        const { username } = req.params as { username: string };



        const content = await streamService.getMasterPlaylist(username);



        if (!content) {
            console.log(`No live content found for user: ${username}`);
            return res.status(404).json({
                message: "No live stream available for this user"
            });
        }

        return sendM3u8(res, content);
    } catch (error: any) {
        console.error("getLive3u8Handler error:", error.message);
        return res.status(500).json({ message: "Error: " + error.message });
    }
};


export const getReplayMasterPlaylist = async (req: Request, res: Response) => {
    try {
        const { username, streamId } = req.params as { username: string, streamId: string };

        const user = await userService.getUserByUsername(username);
        if (!user) return res.status(404).json({ message: "User not found" });

        const stream = await streamService.getStreamById(streamId);
        if (!stream?.recordingKey) return res.status(404).json({ message: "Recording not found" });
  
        const content = await streamService.getS3Content(
            `${stream.recordingKey}/master.m3u8`,
            stream.streamKey,
            streamId
        );

        if (!content) return res.status(404).json({ message: "Recording not found" });

        return sendM3u8(res, content);
    } catch (error: any) {
        console.error("getReplayedm3u8Handler error:", error.message);
        return res.status(500).json({ message: "Error fetching replay: " + error.message });
    }
}

export const getReplayVariantPlaylist = async (req: Request, res: Response) => {
    try {
        const { username, streamId, variant } = req.params as {
            username: string,
            streamId: string,
            variant: string
        };



        const user = await userService.getUserByUsername(username);
        if (!user) return res.status(404).json({ message: "User not found" });

        const stream = await streamService.getStreamById(streamId);
        if (!stream?.recordingKey) return res.status(404).json({ message: "Recording not found" });

        const actualVariant = variant.replace(new RegExp(escapeRegExp(streamId), "g"), stream.streamKey);

        const content = await streamService.getS3Content(
            `${stream.recordingKey}/${actualVariant}/index.m3u8`,
            stream.streamKey,
            streamId
        );
        if (!content) return res.status(404).json({ message: "Variant not found" });

        return sendM3u8(res, content);
    } catch (error: any) {
        console.error("getReplayedm3u8VariantHandler error:", error.message);
        return res.status(500).json({ message: "Error fetching variant: " + error.message });
    }
}

export const getReplaySegment = async (req: Request, res: Response) => {
    try {
        const { username, streamId, variant, segment } = req.params as {
            username: string,
            streamId: string,
            variant: string,
            segment: string
        };

        const user = await userService.getUserByUsername(username);
        if (!user) return res.status(404).json({ message: "User not found" });

        const stream = await streamService.getStreamById(streamId);
        if (!stream?.recordingKey) return res.status(404).json({ message: "Recording not found" });
        //the stream is stored with prefix of streamKey and hence replace the incoming streamId request with streamKey
        const actualVariant = variant.replace(new RegExp(escapeRegExp(streamId), "g"), stream.streamKey);
        const key = `${stream.recordingKey}/${actualVariant}/${segment}`;
        console.log("REPLAY SEGMENT:", {
            streamId,
            streamKey: stream.streamKey,
            variant,
            actualVariant,
            segment,
            s3Key: key
        });

        return pipeS3Stream(res, key);
    } catch (error: any) {
        console.error("getReplayedm3u8SegmentHandler error:", error.message);
        return res.status(500).json({ message: "Error fetching segment: " + error.message });
    }
}

export const getLatestStreamsHandler = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await streamService.getLatestStreams(page, limit);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("getLatestStreamsHandler error:", error.message);
        return res.status(500).json({ message: "Error fetching streams: " + error.message });
    }
};

export const getAllStreamsOfUserHandler = async (req: Request, res: Response) => {
    try {
        const { username } = req.params as { username: string };
        const userData = await userService.getUserByUsername(username);
        if (!userData) {
            return res.status(404)
                .json({ message: "user not found" });
        }
        const streams = await streamService.getAllStreamsOfUser(userData.id);

        return res.status(200).json({ data: streams });
    } catch (error: any) {
        console.error("getAllStreamsOfUserHandler error:", error.message);
        return res.status(500).json({ message: "Error fetching streams: " + error.message });
    }
}




const sendM3u8 = async (res: Response, content?: string | null) => {
    if (!content) {
        return res.status(404)
            .json({ message: "content not found" })
    }
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(content);
};

const pipeS3Stream = async (res: Response, key: string) => {
    try {
        const response = await streamService.getS3Object(key);
        res.setHeader("Content-Type", "video/mp2t");
        res.setHeader("Cache-Control", "public, max-age=31536000");
        res.setHeader("Access-Control-Allow-Origin", "*");
        (response.Body as any).pipe(res);
    } catch (error: any) {
        if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
            console.error(`S3 NoSuchKey: ${key}`);
            return res.status(404).json({ message: "Segment not found", key });
        }
        throw error;
    }
};


