import User, { IUser } from "../models/user.model";
import crypto from "crypto";

export class UserRepository {


    async regenerateStreamKey(email:string, streamKey:string): Promise<string> {
       const user = await User.findOneAndUpdate(
      { email: email },
      { streamKey: streamKey },
      { returnDocument: "after" }
       );

      if(!user) {
        throw new Error("User not found for email: " + email);
      }

      return user._id.toString();
    
}

  async setUserLiveStatus(streamKey: string, isLive: boolean): Promise<void> {
    await User.findOneAndUpdate({ streamKey: streamKey }, { isLive: isLive });
    }

    async getUserByUsername(username: string): Promise<{ id: string; email: string; username: string; streamKey: string; isVerified: boolean| undefined } | null> {
        const user = await User.findOne({
            username: username
        });
        
        if (!user) {
            return null;
        }
        return {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            streamKey: user.streamKey,
            isVerified: user.isVerified
        };
    }

 async getUserByStreamKey(streamKey: string): Promise<IUser | null> {
    return await User.findOne({ streamKey });
}

async getUserDetails(username: string) {
  return await User.findOne({ username }, { streamKey: 0 }); 
  // exclude streamKey
}

async getContentCreators(page: number, limit: number) {
  return await User.find(
    { streamKey: { $exists: true } },
    { streamKey: 0, password: 0 }  // exclude sensitive fields
  )
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
}

async getContentCreatorsCount(): Promise<number> {
  return await User.countDocuments({ streamKey: { $exists: true } });
}



}







