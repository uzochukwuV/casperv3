# DEX Backend API - Setup Guide

## Overview

The backend server now includes DEX pool deployment endpoints that integrate with the CasperSwap V3 smart contracts.

**Deployed Contracts (Testnet)**:
- Factory: `contract-package-da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9`
- PositionManager: `contract-package-2855cea2bcc53e5505820c988799db99f05deca7ebfda96dc20793d4d249838e`

---

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# DEX Configuration
FACTORY_CONTRACT_PACKAGE_HASH=da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9
POSITION_MANAGER_CONTRACT_PACKAGE_HASH=2855cea2bcc53e5505820c988799db99f05deca7ebfda96dc20793d4d249838e

# Casper Network
CASPER_NETWORK_NAME=casper-test
CASPER_RPC_URL=http://localhost:7777/rpc

# Optional: For automated pool deployment
DEPLOYER_PRIVATE_KEY_PATH=/path/to/secret_key.pem
DEPLOY_POOL_GAS=500000000000
INITIALIZE_POOL_GAS=100000000000
REGISTER_POOL_GAS=50000000000
```

### 2. Copy Pool.wasm

The Pool.wasm binary needs to be available to the server:

```bash
# From project root
cp smart-contract/wasm/Pool.wasm server/wasm/
```

Verify it's there:
```bash
ls -lh server/wasm/Pool.wasm
# Should show: -rw-r--r-- 1 user user 266K Dec 23 12:11 Pool.wasm
```

### 3. Install Dependencies

Already done! `casper-js-sdk` was installed.

---

## API Endpoints

### 1. Get Pool Creation Arguments

**Endpoint**: `POST /api/dex/pool-args`

**Purpose**: Get the initialization parameters for deploying a pool manually.

**Request Body**:
```json
{
  "token0": "hash-abc123...",
  "token1": "hash-def456...",
  "fee": 3000
}
```

**Response**:
```json
{
  "poolCreationArgs": {
    "factory": "da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9",
    "token0": "hash-abc123...",
    "token1": "hash-def456...",
    "fee": 3000,
    "tick_spacing": 60
  },
  "manualDeploymentInstructions": "# Manual Pool Deployment Instructions\n\ncasper-client put-deploy ..."
}
```

**Fee Options**:
- `500` - 0.05% (tick spacing: 10)
- `3000` - 0.3% (tick spacing: 60)
- `10000` - 1.0% (tick spacing: 200)

---

### 2. Deploy Pool (Automated)

**Endpoint**: `POST /api/dex/deploy-pool`

**Purpose**: Automatically deploy a pool (requires `DEPLOYER_PRIVATE_KEY_PATH` configured).

**Request Body**:
```json
{
  "token0": "hash-abc123...",
  "token1": "hash-def456...",
  "fee": 3000
}
```

**Response** (Success):
```json
{
  "success": true,
  "poolAddress": "contract-package-xyz789...",
  "poolCreationArgs": {
    "factory": "da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9",
    "token0": "hash-abc123...",
    "token1": "hash-def456...",
    "fee": 3000,
    "tick_spacing": 60
  },
  "deployHash": "a5bd69cdc71c3f90cf63338c3f0ba2709274f4b022e1178ece1d9e006c38eea8",
  "steps": {
    "deployPool": {
      "hash": "a5bd69cdc71c3f90...",
      "status": "success"
    }
  }
}
```

**Response** (No Deployer Key):
```json
{
  "success": false,
  "error": "Deployer private key not configured. Pool deployment requires manual deployment via casper-client.",
  "poolCreationArgs": { ... },
  "steps": {}
}
```

---

### 3. Download Pool.wasm

**Endpoint**: `GET /api/dex/pool-wasm`

**Purpose**: Download the Pool.wasm binary for manual deployment.

**Response**: Binary file (application/wasm)

**Usage**:
```bash
curl -O http://localhost:3001/api/dex/pool-wasm
```

---

## Integration with Frontend

### Example: Get Pool Args

```typescript
// frontend/src/dex/api.ts
const API_URL = 'http://localhost:3001';

export async function getPoolCreationArgs(
  token0: string,
  token1: string,
  fee: number
) {
  const response = await fetch(`${API_URL}/api/dex/pool-args`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token0, token1, fee }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}
```

### Example: React Component

```typescript
// frontend/src/dex/components/PoolCreation.tsx
import React, { useState } from 'react';
import { getPoolCreationArgs } from '../api';

export function PoolCreation() {
  const [poolArgs, setPoolArgs] = useState(null);

  const handleGetArgs = async () => {
    try {
      const result = await getPoolCreationArgs(
        'hash-token0...',
        'hash-token1...',
        3000
      );

      setPoolArgs(result.poolCreationArgs);
      console.log('Manual deployment instructions:', result.manualDeploymentInstructions);
    } catch (error) {
      console.error('Failed to get pool args:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGetArgs}>Get Pool Arguments</button>
      {poolArgs && (
        <pre>{JSON.stringify(poolArgs, null, 2)}</pre>
      )}
    </div>
  );
}
```

---

## Deployment Workflow

### Option A: Manual Deployment (Recommended for Testing)

1. **Get Pool Args** via `/api/dex/pool-args`
2. **Deploy Pool.wasm** using casper-client (instructions in response)
3. **Initialize Pool** via frontend (user signs transaction)
4. **Register Pool** via frontend (factory owner signs transaction)

### Option B: Automated Deployment (Requires Setup)

1. Configure `DEPLOYER_PRIVATE_KEY_PATH` with a funded account
2. Call `/api/dex/deploy-pool`
3. Backend deploys Pool.wasm automatically
4. **Initialize Pool** via frontend
5. **Register Pool** via frontend

---

## Security Considerations

### Production Setup

1. **Deployer Key Protection**:
   ```bash
   # Store deployer key securely
   chmod 600 /path/to/secret_key.pem

   # Never commit to git
   echo "*.pem" >> .gitignore
   ```

2. **Rate Limiting**: Add rate limiting to deployment endpoints
   ```typescript
   import rateLimit from 'express-rate-limit';

   const deployLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5, // 5 deployments per IP
   });

   app.post('/api/dex/deploy-pool', deployLimiter, async (req, res) => {
     // ...
   });
   ```

3. **Authentication**: Add API key or JWT authentication
4. **Gas Limits**: Monitor and adjust gas limits based on network conditions

---

## Troubleshooting

### Pool.wasm Not Found

```bash
# Check if file exists
ls -la server/wasm/Pool.wasm

# If not, copy from smart-contract
cp smart-contract/wasm/Pool.wasm server/wasm/
```

### Deployer Key Issues

```bash
# Verify key file exists
cat $DEPLOYER_PRIVATE_KEY_PATH

# Check file permissions
chmod 600 $DEPLOYER_PRIVATE_KEY_PATH
```

### RPC Connection Failed

```bash
# Test RPC connection
curl -X POST http://localhost:7777/rpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"info_get_status","params":[],"id":1}'
```

### Deployment Failed

Check logs for:
- Insufficient gas
- Invalid token addresses
- Fee tier not enabled
- Pool already exists

---

## Testing

### Test Pool Args Endpoint

```bash
curl -X POST http://localhost:3001/api/dex/pool-args \
  -H 'Content-Type: application/json' \
  -d '{
    "token0": "hash-0000000000000000000000000000000000000000000000000000000000000001",
    "token1": "hash-0000000000000000000000000000000000000000000000000000000000000002",
    "fee": 3000
  }'
```

Expected response:
```json
{
  "poolCreationArgs": {
    "factory": "da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9",
    "token0": "hash-0000000000000000000000000000000000000000000000000000000000000001",
    "token1": "hash-0000000000000000000000000000000000000000000000000000000000000002",
    "fee": 3000,
    "tick_spacing": 60
  },
  "manualDeploymentInstructions": "..."
}
```

### Test Pool.wasm Download

```bash
curl -O http://localhost:3001/api/dex/pool-wasm

# Verify file size (should be ~265KB)
ls -lh Pool.wasm
```

---

## Next Steps

1. **Frontend Integration**: Use [../frontend/POOL_INTEGRATION_GUIDE.md](../frontend/POOL_INTEGRATION_GUIDE.md)
2. **Smart Contracts**: See [../smart-contract/dex-contracts/FACTORY_SOLUTION.md](../smart-contract/dex-contracts/FACTORY_SOLUTION.md)
3. **Architecture**: Read [../POOL_DEPLOYMENT_ANALYSIS.md](../POOL_DEPLOYMENT_ANALYSIS.md)

---

## API Reference Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/dex/pool-args` | POST | Get pool initialization args | No |
| `/api/dex/deploy-pool` | POST | Deploy pool (if deployer key configured) | No (but requires funded deployer) |
| `/api/dex/pool-wasm` | GET | Download Pool.wasm binary | No |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FACTORY_CONTRACT_PACKAGE_HASH` | No | (testnet hash) | Factory contract address |
| `POSITION_MANAGER_CONTRACT_PACKAGE_HASH` | No | (testnet hash) | Position manager address |
| `CASPER_NETWORK_NAME` | No | `casper-test` | Network name |
| `CASPER_RPC_URL` | No | `http://localhost:7777/rpc` | RPC endpoint |
| `DEPLOYER_PRIVATE_KEY_PATH` | No | - | Path to deployer PEM file |
| `DEPLOY_POOL_GAS` | No | `500000000000` | Gas for pool deployment |
| `INITIALIZE_POOL_GAS` | No | `100000000000` | Gas for initialization |
| `REGISTER_POOL_GAS` | No | `50000000000` | Gas for registration |
