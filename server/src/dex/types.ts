/**
 * Type definitions for DEX contracts
 * Matches Rust smart contract types
 */

export interface PoolCreationArgs {
  factory: string;
  token0: string;
  token1: string;
  fee: number;
  tick_spacing: number;
}

export interface DeployPoolRequest {
  token0: string;
  token1: string;
  fee: number;
  initialPrice?: string; // Optional: sqrt(price) * 2^96 as string
}

export interface DeployPoolResponse {
  success: boolean;
  poolAddress?: string;
  poolCreationArgs?: PoolCreationArgs;
  deployHash?: string;
  error?: string;
  steps: {
    getArgs?: { hash: string; status: string };
    deployPool?: { hash: string; status: string };
    initializePool?: { hash: string; status: string };
    registerPool?: { hash: string; status: string };
  };
}

export interface GetPoolRequest {
  token0: string;
  token1: string;
  fee: number;
}

export interface GetPoolResponse {
  poolAddress: string | null;
  exists: boolean;
}

export interface PoolInfo {
  factory: string;
  token0: string;
  token1: string;
  fee: number;
  tick_spacing: number;
  max_liquidity_per_tick: string;
}

export interface Slot0 {
  sqrt_price_x96: string;
  tick: number;
  observation_index: number;
  observation_cardinality: number;
  observation_cardinality_next: number;
  unlocked: boolean;
}
