import mongoose, { Schema, Document } from "mongoose";


export interface IStream extends Document {
    name: string;
    streamKey: string;
    createdAt: Date;
    endedAt?: Date;
    userId: mongoose.Types.ObjectId;
    isLive: boolean;
    recordingKey?: string;  
    duration?: number;
}

const StreamSchema = new Schema<IStream>({
  name: { type: String, required: true },

  streamKey: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },

  endedAt: { type: Date, default: null },

  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",  
    required: true,
  },
  isLive: { type: Boolean, default: true },
  recordingKey: { type: String, default: null },
  duration: { type: Number, default: null },
});

export default mongoose.model<IStream>("Stream", StreamSchema);