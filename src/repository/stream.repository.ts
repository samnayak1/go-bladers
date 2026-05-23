import mongoose from "mongoose";
import Stream, { IStream } from "../models/stream.model";
import User from "../models/user.model"


export class StreamRepository {
async createStream(userName: string, streamKey: string, userId: string): Promise<void> {
    await Stream.findOneAndUpdate(
        { streamKey },
        {
            $set: {
                name: `${userName}'s stream ${Math.random().toString(16).substring(2, 8)}`,
                userId,
                isLive: true,
            }
        },
        { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
        { streamKey },
        { isLive: true }
    );
}



    async endStream(streamKey: string): Promise<string | null> {
        let streamId: string | null = null;

        await User.findOneAndUpdate(
            { streamKey: streamKey },
            { isLive: false }
        );

        const stream = await Stream.findOne({ streamKey: streamKey, isLive: true }).sort({ createdAt: -1 });

        if (stream) {
            const duration = Math.floor((Date.now() - stream.createdAt.getTime()) / 1000);
            await Stream.findByIdAndUpdate(
                stream._id,
                { isLive: false, endedAt: new Date(), duration }
            );
            streamId = stream._id.toString();
        }

        return streamId;
    }

    async getStreamsByUserId(userId: string): Promise<IStream[]> {
        const streams = await Stream.find({
            userId: userId
        },{streamKey:0})
        .sort({ createdAt: -1 })
        .populate("userId", "username");


        return streams;

   }

    async updateStreamRecordingKey(streamId: string, recordingKey: string) {
        await Stream.findByIdAndUpdate(streamId, {
            recordingKey: recordingKey,
        });
    }

    async getStreamById(streamId: string): Promise<IStream | null> {
        return await Stream.findOne({ _id: streamId});
    }
    async getAllStreamsMarkedIsLiveTrue(){
         return await Stream.find({
            isLive: true,
        });
    }

    async getLatestStreams(page: number, limit: number): Promise<IStream[]> {
        return await Stream.find({
            isLive: false,
            recordingKey: { $ne: null },
        }, { streamKey: 0 })  // exclude streamKey
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("userId", "username");
    }

    async getLatestStreamsCount(): Promise<number> {
        return await Stream.countDocuments({
            isLive: false,
            recordingKey: { $ne: null },
        });
    }

    async updateThumbnailKey(streamId: string, thumbnailKey: string): Promise<void> {
           await Stream.findByIdAndUpdate(streamId, { thumbnailKey });
     }

    


}
