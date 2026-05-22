import { CodeDeliveryFailureException, CodeMismatchException, CognitoIdentityProviderClient, ConfirmSignUpCommand, ExpiredCodeException, InitiateAuthCommand, InvalidParameterException, InvalidPasswordException, LimitExceededException, NotAuthorizedException, PasswordResetRequiredException, ResendConfirmationCodeCommand, SignUpCommand, TooManyRequestsException, UsernameExistsException, UserNotConfirmedException, UserNotFoundException } from "@aws-sdk/client-cognito-identity-provider";
import { IAuthService } from "../interfaces/IAuthService";
import crypto from "crypto";
import { AuthRepository } from "../../repository/auth.repository";
import jwt,{ JwtPayload } from "jsonwebtoken";

export class AuthService implements IAuthService {

  private cognitoClient: CognitoIdentityProviderClient;
  private clientId: string;
  private clientSecret: string;
  private authRepository: AuthRepository; 

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION!,
    });
    this.clientId = process.env.COGNITO_CLIENT_ID!;
    this.clientSecret = process.env.COGNITO_CLIENT_SECRET!;
    this.authRepository = new AuthRepository();
  }




async signUp(
  email: string,
  password: string,
  userName: string
): Promise<string> {
  try {
    await this.cognitoClient.send(
      new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        SecretHash: this.generateSecretHash(
          email,
          this.clientId,
          this.clientSecret
        ),
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "preferred_username", Value: userName },
        ],
      })
    );

    const streamKey = crypto.randomBytes(16).toString("hex");

    const userId = await this.authRepository.saveUser({
      username: userName,
      email,
      streamKey,
      isVerified: false,
    });

    return userId;
  } catch (error: any) {
    console.error("Cognito signup error:", error);

    if (error instanceof UsernameExistsException) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    if (error instanceof InvalidPasswordException) {
      throw new Error("INVALID_PASSWORD");
    }

    if (error instanceof InvalidParameterException) {
      throw new Error(error.message);
    }

    if (error instanceof CodeDeliveryFailureException) {
      throw new Error("EMAIL_DELIVERY_FAILED");
    }

    throw new Error("SIGNUP_FAILED");
  }
}
   async signIn(
  email: string,
  password: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}> {
  try {
    const response = await this.cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: this.generateSecretHash(
            email,
            this.clientId,
            this.clientSecret
          ),
        },
      })
    );

    const tokens = response.AuthenticationResult;

    if (!tokens) {
      throw new Error("Authentication failed. Cognito did not return tokens.");
    }

    if (
      !tokens.AccessToken ||
      !tokens.RefreshToken ||
      !tokens.IdToken ||
      !tokens.ExpiresIn
    ) {
      throw new Error("Authentication failed. Missing tokens.");
    }

    return {
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
      idToken: tokens.IdToken,
      expiresIn: tokens.ExpiresIn,
    };

  } catch (error: any) {
    console.error("Cognito sign in error:", error);

    if (error instanceof NotAuthorizedException) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (error instanceof UserNotConfirmedException) {
      throw new Error("USER_NOT_CONFIRMED");
    }

    if (error instanceof UserNotFoundException) {
      throw new Error("USER_NOT_FOUND");
    }

    if (error instanceof PasswordResetRequiredException) {
      throw new Error("PASSWORD_RESET_REQUIRED");
    }

    if (error instanceof TooManyRequestsException) {
      throw new Error("TOO_MANY_REQUESTS");
    }

    throw new Error("SIGNIN_FAILED");
  }
}

async resendConfirmationCode(
  email: string
): Promise<void> {
  try {
    await this.cognitoClient.send(
      new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
        SecretHash: this.generateSecretHash(
          email,
          this.clientId,
          this.clientSecret
        ),
      })
    );

  } catch (error: any) {
    console.error(
      "Resend confirmation code error:",
      error
    );

    if (error instanceof UserNotFoundException) {
      throw new Error("USER_NOT_FOUND");
    }

    if (error instanceof TooManyRequestsException) {
      throw new Error("TOO_MANY_REQUESTS");
    }

    if (error instanceof LimitExceededException) {
      throw new Error("LIMIT_EXCEEDED");
    }

    if (error instanceof InvalidParameterException) {
      throw new Error(error.message);
    }

    throw new Error("RESEND_CODE_FAILED");
  }
}


async confirmUser(email: string, code: string): Promise<boolean> {
  try {
    await this.cognitoClient.send(
      new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        SecretHash: this.generateSecretHash(email, this.clientId, this.clientSecret),
      })
    );
  } catch (error) {
    if (error instanceof CodeMismatchException) {
      throw new Error("Invalid confirmation code.");
    }
    if (error instanceof ExpiredCodeException) {
      throw new Error("Confirmation code has expired.");
    }
    if (error instanceof UserNotFoundException) {
      throw new Error("User not found.");
    }
    if (error instanceof NotAuthorizedException) {
      throw new Error("User is already confirmed.");
    }

    throw error;
  }


  const updateResult = await this.authRepository.updateVerification(email);
  return updateResult;
}
    
async userSessionDetails(email: string): Promise<{ email: string; userName: string; streamKey: string; userId:string }> {
        return this.authRepository.getUserByEmail(email).then(user => {
            if (!user) {
                throw new Error("User not found for email: " + email);
            }
            return {
                email: user.email,
                userName: user.username,
                streamKey: user.streamKey,
                userId:user.userId
            };
        });
    }


    async refreshToken(token: string,userId:string): Promise<{accessToken:string, refreshToken:string, idToken:string, expiresIn:number}> {
      


    if (!userId) {
      throw new Error("Invalid token: missing sub claim");
    }

    const response = await this.cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: token,
          SECRET_HASH: this.generateSecretHash(userId, this.clientId, this.clientSecret), // use sub not email
        },
      })
    );

    const tokens = response.AuthenticationResult;

    return {
        accessToken: tokens?.AccessToken!,
        refreshToken: token, 
        idToken: tokens?.IdToken!,
        expiresIn: tokens?.ExpiresIn!
    };
    }
 
 
  generateSecretHash(username: string, clientId: string, clientSecret: string) {
    return crypto
    .createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64");
  };


};