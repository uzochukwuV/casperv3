import fs from 'fs';
import path from 'path';
import {
  RpcClient,
  HttpHandler,
  PrivateKey,
  KeyAlgorithm,
  SessionBuilder,
  Args,
  CLValue,
  Key,
  Transaction,
} from 'casper-js-sdk';
import { dexConfig, getFeeTier } from './config';
import { PoolCreationArgs, DeployPoolRequest, DeployPoolResponse } from './types';

/**
 * Pool Deployment Service
 *
 * Handles the 4-step pool deployment workflow:
 * 1. Get pool creation args from factory
 * 2. Deploy Pool.wasm with those args
 * 3. Initialize pool with starting price
 * 4. Register pool in factory
 */
export class PoolDeploymentService {
  private client: RpcClient;
  private deployerPrivateKey: PrivateKey | null = null;

  // 'https://rpc.testnet.casperlabs.io',
  //   'https://testnet.casperblockchain.io:7777/rpc',
  //   'http://3.14.161.135:7777/rpc',
  //   'http://3.143.158.19:7777/rpc',
  //   'https://node.testnet.casper.network',

  constructor() {
    const handler = new HttpHandler('https://node.testnet.casper.network/rpc');
    this.client = new RpcClient(handler);


    // Load deployer key if provided
    if (dexConfig.deployerPrivateKeyPath) {
      try {
        const keyContent = fs.readFileSync(dexConfig.deployerPrivateKeyPath, 'utf-8');
        // Assume ED25519 key (most common on Casper)
        this.deployerPrivateKey = PrivateKey.fromPem(keyContent, KeyAlgorithm.ED25519);
      } catch (error) {
        console.warn('Failed to load deployer private key:', error);
        console.warn('Pool deployment will require external signing');
      }
    }
  }

  /**
   * Deploy a new pool (simplified - returns args for manual deployment)
   *
   * NOTE: Full automated deployment requires a funded deployer account
   * For now, this returns the PoolCreationArgs that should be used
   * for manual deployment via casper-client
   */
  async deployPool(request: DeployPoolRequest): Promise<DeployPoolResponse> {
    const response: DeployPoolResponse = {
      success: false,
      steps: {},
    };

    try {
      // Validate fee tier
      const feeTier = getFeeTier(request.fee);
      if (!feeTier) {
        throw new Error(`Invalid fee tier: ${request.fee}. Use 500, 3000, or 10000`);
      }

      // Step 1: Construct pool creation args
      // In production, you'd call factory.create_pool() to get these
      // For now, we construct them manually based on the pattern
      const poolCreationArgs = this.constructPoolCreationArgs(
        request.token0,
        request.token1,
        request.fee,
        feeTier.tickSpacing
      );
      console.log('Constructed Pool Creation Args:', poolCreationArgs);

      response.poolCreationArgs = poolCreationArgs;

      // Step 2: Check if deployer key is available
      if (!this.deployerPrivateKey) {
        response.error = 'Deployer private key not configured. Pool deployment requires manual deployment via casper-client.';
        response.success = false;
        return response;
      }

      // Step 3: Deploy Pool.wasm
      const poolWasmPath = path.resolve(__dirname, '../../wasm/Pool.wasm');
      if (!fs.existsSync(poolWasmPath)) {
        throw new Error(`Pool.wasm not found at ${poolWasmPath}`);
      }

      const poolWasm = fs.readFileSync(poolWasmPath);
      const transaction = this.deployPoolContract(poolWasm, poolCreationArgs);

      // Get transaction hash
      const txHash = transaction.hash.toHex();
      response.steps.deployPool = {
        hash: txHash,
        status: 'pending',
      };

      console.log(`Submitting Pool deployment with hash: ${txHash}`);

      // Step 4: Send transaction to network (Casper 2.0)
      try {
        console.log(`Sending transaction to network...`);
        console.log(await this.client.getLatestBlock());
        const putTxResult = await this.client.putTransaction(transaction);
        console.log(`Successfully sent transaction. Result:`, putTxResult);
      } catch (putError: any) {
        console.error(`Failed to send transaction:`, putError);
        throw new Error(`Failed to submit transaction to network: ${putError.message || JSON.stringify(putError)}`);
      }

      // Step 5: Wait for transaction execution
      const deployResult = await this.client.getDeploy(txHash);
      console.log(`Received deploy result for hash: ${txHash}`);

      if (deployResult.deploy && deployResult.executionResultsV1) {
        const executionResults = deployResult.executionResultsV1;
        console.log(`Execution results:`, executionResults);

        // Check if execution was successful
        if (executionResults.length > 0 && executionResults[0].result.success) {
          // Extract pool contract package hash from transforms
          const successResult: any = executionResults[0].result.success;
          const transforms = successResult.effect.transforms;
          const contractPackageHash = this.extractContractPackageHash(transforms);

          if (contractPackageHash) {
            response.poolAddress = contractPackageHash;
            response.deployHash = txHash;
            response.success = true;
            response.steps.deployPool!.status = 'success';
          } else {
            throw new Error('Failed to extract pool contract package hash from deployment');
          }
        } else {
          const errorMessage = JSON.stringify(executionResults[0]?.result);
          throw new Error(`Pool deployment failed: ${errorMessage}`);
        }
      } else {
        throw new Error('Deployment result not found or incomplete');
      }

      // Note: Steps 3 (initialize) and 4 (register) should be done by the pool creator/factory owner
      // via the frontend, as they require specific user signatures

      return response;
    } catch (error: any) {
      response.success = false;
      response.error = error.message;
      return response;
    }
  }

  /**
   * Construct pool creation args (matches factory.create_pool output)
   */
  private constructPoolCreationArgs(
    token0: string,
    token1: string,
    fee: number,
    tickSpacing: number
  ): PoolCreationArgs {
    // Order tokens (token0 < token1)
    const [orderedToken0, orderedToken1] = this.orderTokens(token0, token1);

    return {
      factory: dexConfig.factoryPackageHash,
      token0: orderedToken0,
      token1: orderedToken1,
      fee,
      tick_spacing: tickSpacing,
    };
  }

  /**
   * Deploy Pool.wasm contract using SessionBuilder (casper-js-sdk v5)
   * Returns a Transaction for Casper 2.0 networks
   */
  private deployPoolContract(
    poolWasm: Buffer,
    args: PoolCreationArgs
  ): Transaction {
    if (!this.deployerPrivateKey) {
      throw new Error('Deployer private key not available');
    }

    // Get public key from private key (it's a getter, not a method)
    const publicKey = this.deployerPrivateKey.publicKey;
    console.log(`Using deployer public key: ${publicKey.toHex()}`);

    // Build runtime args for Pool initialization
    const argsMap = new Map<string, CLValue>([
      ['factory', this.parseContractAddress(args.factory)],
      ['token0', this.parseContractAddress(args.token0)],
      ['token1', this.parseContractAddress(args.token1)],
      ['fee', CLValue.newCLUInt32(args.fee)],
      ['tick_spacing', CLValue.newCLInt32(args.tick_spacing)],
    ]);
    const runtimeArgs = new Args(argsMap);

    // Use SessionBuilder to create installation transaction for Casper 2.0
    const transaction = new SessionBuilder()
      .from(publicKey)
      .chainName(dexConfig.networkName)
      .wasm(Uint8Array.from(poolWasm))
      .installOrUpgrade()
      .runtimeArgs(runtimeArgs)
      .payment(parseInt(dexConfig.gasLimits.deployPool))
      .ttl(180000) // 3 minutes
      .build(); // Build as Transaction for Casper 2.0

    // Sign the transaction
    transaction.sign(this.deployerPrivateKey);

    console.log(`Signed transaction with hash: ${transaction.hash.toHex()}`);
    return transaction;
  }

  /**
   * Extract contract package hash from deployment transforms
   */
  private extractContractPackageHash(transforms: any[]): string | null {
    for (const transform of transforms) {
      // Look for WriteContractPackage transform
      if (transform.transform && 'WriteContractPackage' in transform.transform) {
        // Extract hash from the key
        const key = transform.key;
        if (key.startsWith('hash-')) {
          const packageHash = key.replace('hash-', '');
          return `contract-package-${packageHash}`;
        }
      }
    }
    return null;
  }

  /**
   * Order tokens lexicographically
   */
  private orderTokens(tokenA: string, tokenB: string): [string, string] {
    return tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  }

  /**
   * Parse contract address to CLValue Key
   */
  private parseContractAddress(address: string): CLValue {
    // Ensure address has proper prefix for Key.newKey()
    // Try different prefix formats - SDK uses "package-" in v5
    let prefixedAddress = address;
    if (!address.startsWith('package-') && !address.startsWith('hash-') && !address.startsWith('contract-package-')) {
      // If it's just the hash hex, try package- prefix (casper-js-sdk v5)
      prefixedAddress = `package-${address}`;
    }

    console.log(`Parsing contract address: ${address} -> ${prefixedAddress}`);

    // Key.newKey() accepts prefixed string format
    const key = Key.newKey(prefixedAddress);
    console.log(`Created Key with type: ${key.type}`);

    return CLValue.newCLKey(key);
  }

  /**
   * Get deployment instructions for manual deployment
   */
  getManualDeploymentInstructions(args: PoolCreationArgs): string {
    return `
# Manual Pool Deployment Instructions

1. Deploy Pool.wasm using casper-client:

casper-client put-deploy \\
  --node-address ${dexConfig.rpcUrl} \\
  --chain-name ${dexConfig.networkName} \\
  --secret-key <YOUR_SECRET_KEY.pem> \\
  --payment-amount ${dexConfig.gasLimits.deployPool} \\
  --session-path ./smart-contract/wasm/Pool.wasm \\
  --session-arg "factory:byte_array='${args.factory}'" \\
  --session-arg "token0:byte_array='${args.token0}'" \\
  --session-arg "token1:byte_array='${args.token1}'" \\
  --session-arg "fee:u32='${args.fee}'" \\
  --session-arg "tick_spacing:i32='${args.tick_spacing}'"

2. Wait for deployment and get the pool contract package hash

3. Initialize the pool via frontend (user signs transaction)

4. Register the pool via frontend (factory owner signs transaction)
`;
  }
}
