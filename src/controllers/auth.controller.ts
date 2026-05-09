



import { Response,Request } from "express"
import { AuthRequest } from "../middleware/auth.middleware"
import { AuthService } from "../services/implementations/auth.service";
import { UserService } from "../services/implementations/user.service";




const authService = new AuthService();
const userService=new UserService();

export const signupHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, userName }: { email: string, password: string, userName: string } = req.body;
        const userId = await authService.signUp(email, password, userName);

        return res.status(201).json({
            message: "User registered. Please check your email to confirm.",
            userId: userId
        });

    } catch (error: any) {
        console.error("Register error:", error);
        res.status(500).json({ error: error.message });

    }
}
export const confirmRegistrationCodeHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { email, code }: { email: string, code: string } = req.body;
        const isConfirmationSuccess = await authService.confirmUser(email, code);

        if (!isConfirmationSuccess) {
            return res.status(500).json({ error: "Failed to update verification status." });
        }

        return res.status(200).json({ message: "Account confirmed successfully." });

    } catch (error: any) {
        console.error("Confirmation Error:", error);

        const clientErrors: Record<string, number> = {
            "Invalid confirmation code.": 400,
            "Confirmation code has expired.": 400,
            "User not found.": 404,
            "User is already confirmed.": 409,
        };

        const statusCode = clientErrors[error.message] ?? 500;
        return res.status(statusCode).json({ error: error.message });
    }
};



export const loginHandler = async (req: Request, res: Response) => {

    try {


        const { email, password }: { email: string, password: string } = req.body;

        const signInPayload = await authService.signIn(email, password);

        return res.status(200)
            .json({
                accessToken: signInPayload.accessToken,
                refreshToken: signInPayload.refreshToken,
                idToken: signInPayload.idToken,
                expiresIn: signInPayload.expiresIn
            })
    } catch (error:any) {
        console.error("ERROR while loggin in",error.message);
        return res.status(500)
            .json({ message: "Sign in failed"+error })
    }
}


export const refreshTokenHandler = async (req: AuthRequest, res: Response) => {

    try {

        const { token, userId } = req.body as {token:string, userId:string};
        const refreshTokenResponsePayload = await authService.refreshToken(token,userId);

        return res.status(200)
            .json({
                accessToken: refreshTokenResponsePayload.accessToken,
                refreshToken: refreshTokenResponsePayload.refreshToken,
                idToken: refreshTokenResponsePayload.idToken,
                expiresIn: refreshTokenResponsePayload.expiresIn
            })


    } catch (error:any) {
        console.error("ERROR while refreshing token",error.message);
          return res.status(500)
            .json({ message: "refresh token failed"+error })
    }


}


export const sessionUserDetailsHandler = async (req: AuthRequest, res: Response) => {
       try {
         
    const user=req.user;
    if (!user) 
        return res.status(404).json({ error: "User not found" });

    const userData=await authService.userSessionDetails(req.user?.email);

     res.status(200)
        .json({
                 username: userData.userName,
                 email: userData.email,
                 streamKey: userData.streamKey,
                 id:userData.userId
        })



       } catch (error) {

         return res.status(500)
            .json({ message: "refresh token failed"+error })
        
       }

}

export const getUserDetailsHandler = async (req: Request, res: Response) => {
  try {
    const { username } = req.params as {username:string};
    const user = await userService.getUserDetails(username);
    return res.status(200).json({ data: user });
  } catch (error: any) {
    console.error("getUserDetailsHandler error:", error.message);
    return res.status(500).json({ message: "Error fetching user: " + error.message });
  }

};

export const getContentCreatorsHandler = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await userService.getContentCreators(page, limit);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("getContentCreatorsHandler error:", error.message);
    return res.status(500).json({ message: "Error fetching creators: " + error.message });
  }
};



