




export interface IAuthService{

    signUp(email:string, password:string, userName:string):Promise<string>;
    signIn(email:string, password:string):Promise<{accessToken:string, refreshToken:string, idToken:string, expiresIn:number}>;
    confirmUser(email:string, code:string):Promise<boolean>;
    userSessionDetails(token:string):Promise<{email:string, userName:string, streamKey:string}>;
    refreshToken(token:string,username:string):Promise<{accessToken:string, refreshToken:string, idToken:string, expiresIn:number}>;



}