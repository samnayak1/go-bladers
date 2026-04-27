#!/bin/sh
VAULT_ADDR=http://127.0.0.1:8200

# Check if vault is reachable
if ! vault status -address=$VAULT_ADDR > /dev/null 2>&1; then
  echo "Vault is not reachable"
  exit 1
fi

# Check if vault is unsealed
SEALED=$(vault status -address=$VAULT_ADDR | grep Sealed | awk '{print $2}')
if [ "$SEALED" = "true" ]; then
  echo "Vault is sealed"
  exit 1
fi

# Check if vault is initialized
INITIALIZED=$(vault status -address=$VAULT_ADDR | grep Initialized | awk '{print $2}')
if [ "$INITIALIZED" = "false" ]; then
  echo "Vault is not initialized"
  exit 1
fi

echo "Vault is healthy"
exit 0