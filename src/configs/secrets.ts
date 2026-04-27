import axios from "axios";

interface AppSecrets {
  MONGODB_URI: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_CLIENT_SECRET:string;
}


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRetryDelay = (attempt: number, baseDelay = 1000, maxDelay = 30000): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
  const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  //to avoid thundering herd problem, we add some jitter to the delay
  const jitter = Math.random() * exponential;
  
  return jitter;
};

export const getSecrets = async (retries = 10): Promise<AppSecrets> => {
  console.log("Waiting for Vault to be ready...");
  await sleep(5000); // initial wait

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(
        `${process.env.VAULT_ADDR}/v1/secret/data/gobladers`,
        {
          headers: {
            "X-Vault-Token": process.env.VAULT_TOKEN,
          },
          timeout: 5000,
        }
      );
      console.log("Secrets fetched from Vault");
      return response.data.data.data as AppSecrets;
    } catch (err) {
      if (i === retries - 1) {
        console.error("Failed to fetch secrets from Vault after all retries:", err);
        process.exit(1);
      }

      const delay = getRetryDelay(i);
      console.log(`Vault not ready, retrying in ${(delay / 1000).toFixed(2)}s... (${i + 1}/${retries})`);
      await sleep(delay);
    }
  }

  throw new Error("Failed to fetch secrets");
};