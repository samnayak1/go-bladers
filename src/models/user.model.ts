import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  streamKey: string;
  createdAt: Date;
  isLive?: boolean;
  isVerified?: boolean;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  streamKey:{ type: String, required: true, unique: true },
  createdAt:{ type: Date, default: Date.now },
  isLive:   { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
});

export default mongoose.model<IUser>("User", UserSchema);