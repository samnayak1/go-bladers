

export interface AppSecrets {
  MONGODB_URI: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_CLIENT_SECRET: string;
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
  };
};