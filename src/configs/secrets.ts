

export interface AppSecrets {
  MONGODB_URI: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_CLIENT_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
}

export const getSecrets = async (): Promise<AppSecrets> => {
  const required = [
    "MONGODB_URI",
    "COGNITO_USER_POOL_ID", 
    "COGNITO_CLIENT_ID",
    "COGNITO_CLIENT_SECRET",
  ];


  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID!,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID!,
    COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET!,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
    S3_BUCKET: process.env.S3_BUCKET!,
  };
};