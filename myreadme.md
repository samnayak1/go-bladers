docker exec -it vault sh

export VAULT_ADDR=http://127.0.0.1:8200
vault login <root_token>
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
vault operator init
vault kv enable-secrets
vault secrets enable -path=secret kv-v2
vault status
vault kv put secret/gobladers \
  MONGODB_URI="xxxxxxxxxxxxxxxxxxxxx" \
  COGNITO_USER_POOL_ID="us-east-1_xxxxxxxx" \
  COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
  COGNITO_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxx"

vault secrets list -detailed
vault kv get secret/gobladers