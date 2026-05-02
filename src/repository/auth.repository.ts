import User from "../models/user.model";



export class AuthRepository {


    async saveUser( userCredentials: {
            username: string;
            email: string;
            streamKey: string;
            isVerified: boolean }): Promise<string> {

        const user = new User({
            username: userCredentials.username,
            email: userCredentials.email,
            streamKey: userCredentials.streamKey,
            isVerified: userCredentials.isVerified,

        });

        const savedUser = await user.save();
        return savedUser._id.toString();
    }


    async updateVerification(email: string): Promise<boolean> {
        const userUpdate= await User.findOneAndUpdate({ email }, { isVerified: true });

         return userUpdate !== null;
    }

    async getUserByEmail(email: string): Promise<{ email: string; username: string; streamKey: string; isVerified: boolean| undefined,userId:string } | null> {
        const user = await User.findOne({
            email: email
        });

        if (!user) {
            return null;
        }

        return {
            email: user.email,
            username: user.username,
            streamKey: user.streamKey,
            isVerified: user.isVerified,
            userId:user._id.toString()

        };
    }   





}

