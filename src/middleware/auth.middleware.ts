import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

let cognitoUserPoolId: string;
let cognitoClientId: string;
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const initCognito = (userPoolId: string, clientId: string) => {
  cognitoUserPoolId = userPoolId;
  cognitoClientId = clientId;
};

const getClient = () =>
  jwksClient({
    jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`,
  });

const getSigningKey = (kid: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const client = getClient();
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
};

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string") {
      return res.status(401).json({ error: "Invalid token" });
    }

    const signingKey = await getSigningKey(decoded.header.kid!);

    const payload = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      audience: cognitoClientId,
    }) as JwtPayload;

    req.user = payload; 
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};