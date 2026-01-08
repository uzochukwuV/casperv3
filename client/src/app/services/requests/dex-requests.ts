import {
	Args,
	CLValue,
	PublicKey,
	ContractCallBuilder,
	Transaction,
	Key,
} from 'casper-js-sdk';
import { CSPRToMotes } from '../../utils/currency';

/**
 * DEX Transaction Request Functions
 * These functions prepare transactions for DEX operations using casper-js-sdk v5 API
 */

// Gas prices for DEX operations (in CSPR)
const SWAP_GAS = 10;
const MINT_GAS = 15;
const BURN_GAS = 10;
const APPROVE_GAS = 3;
const CREATE_POOL_GAS = 20;

/**
 * Prepare swap transaction
 * Swaps one token for another in a pool
 */
export const prepareSwapTransaction = async (
	playerPublicKey: PublicKey,
	token0: string,
	token1: string,
	fee: number,
	recipient: string,
	zeroForOne: boolean,
	amountSpecified: string,
	sqrtPriceLimitX96: string
): Promise<Transaction> => {
	const token0Key = Key.newKey(`account-hash-${token0}`);
	const token1Key = Key.newKey(`account-hash-${token1}`);
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.dex_contract_package_hash)
		.entryPoint('swap')
		.runtimeArgs(Args.fromMap({
			token0: CLValue.newCLKey(token0Key),
			token1: CLValue.newCLKey(token1Key),
			fee: CLValue.newCLUInt32(fee),
			recipient: CLValue.newCLKey(recipientKey),
			zero_for_one: CLValue.newCLValueBool(zeroForOne),
			amount_specified: CLValue.newCLInt64(parseInt(amountSpecified)),
			sqrt_price_limit_x96: CLValue.newCLUInt256(sqrtPriceLimitX96)
		}))
		.payment(CSPRToMotes(SWAP_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare add liquidity (mint) transaction
 * Adds liquidity to a specific price range
 */
export const prepareMintTransaction = async (
	playerPublicKey: PublicKey,
	token0: string,
	token1: string,
	fee: number,
	recipient: string,
	tickLower: number,
	tickUpper: number,
	amount: string,
	amount0Min: string , 
	amount1Min: string 
): Promise<Transaction> => {
	const token0Key = Key.newKey(`account-hash-${token0}`);
	const token1Key = Key.newKey(`account-hash-${token1}`);
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.dex_contract_package_hash)
		.entryPoint('mint')
		.runtimeArgs(Args.fromMap({
			token0: CLValue.newCLKey(token0Key),
			token1: CLValue.newCLKey(token1Key),
			fee: CLValue.newCLUInt32(fee),
			recipient: CLValue.newCLKey(recipientKey),
			tick_lower: CLValue.newCLInt32(tickLower),
			tick_upper: CLValue.newCLInt32(tickUpper),
			amount: CLValue.newCLUInt128(amount),
			amount0_min: CLValue.newCLUInt256(amount0Min),
			amount1_min: CLValue.newCLUInt256(amount1Min)
		}))
		.payment(CSPRToMotes(MINT_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare remove liquidity (burn) transaction
 * Removes liquidity from a position
 */
export const prepareBurnTransaction = async (
	playerPublicKey: PublicKey,
	token0: string,
	token1: string,
	fee: number,
	tickLower: number,
	tickUpper: number,
	amount: string
): Promise<Transaction> => {
	const token0Key = Key.newKey(`account-hash-${token0}`);
	const token1Key = Key.newKey(`account-hash-${token1}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.dex_contract_package_hash)
		.entryPoint('burn')
		.runtimeArgs(Args.fromMap({
			token0: CLValue.newCLKey(token0Key),
			token1: CLValue.newCLKey(token1Key),
			fee: CLValue.newCLUInt32(fee),
			tick_lower: CLValue.newCLInt32(tickLower),
			tick_upper: CLValue.newCLInt32(tickUpper),
			amount: CLValue.newCLUInt128(amount)
		}))
		.payment(CSPRToMotes(BURN_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare collect fees transaction
 * Collects accumulated fees and tokens owed from a position
 */
export const prepareCollectTransaction = async (
	playerPublicKey: PublicKey,
	token0: string,
	token1: string,
	fee: number,
	recipient: string,
	tickLower: number,
	tickUpper: number,
	amount0Max: string,
	amount1Max: string
): Promise<Transaction> => {
	const token0Key = Key.newKey(`account-hash-${token0}`);
	const token1Key = Key.newKey(`account-hash-${token1}`);
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.dex_contract_package_hash)
		.entryPoint('collect')
		.runtimeArgs(Args.fromMap({
			token0: CLValue.newCLKey(token0Key),
			token1: CLValue.newCLKey(token1Key),
			fee: CLValue.newCLUInt32(fee),
			recipient: CLValue.newCLKey(recipientKey),
			tick_lower: CLValue.newCLInt32(tickLower),
			tick_upper: CLValue.newCLInt32(tickUpper),
			amount0_requested: CLValue.newCLUInt128(amount0Max),
			amount1_requested: CLValue.newCLUInt128(amount1Max)
		}))
		.payment(CSPRToMotes(BURN_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare token approval transaction
 * Must be called before mint/swap to approve DEX to spend tokens
 */
export const prepareApproveTransaction = async (
	playerPublicKey: PublicKey,
	tokenContractHash: string,
	spender: string,
	amount: string
): Promise<Transaction> => {
	const spenderKey = Key.newKey(`account-hash-${spender}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(tokenContractHash)
		.entryPoint('approve')
		.runtimeArgs(Args.fromMap({
			spender: CLValue.newCLKey(spenderKey),
			amount: CLValue.newCLUInt256(amount)
		}))
		.payment(CSPRToMotes(APPROVE_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare create pool transaction
 * Creates a new liquidity pool for a token pair with specified fee tier
 */
export const prepareCreatePoolTransaction = async (
	playerPublicKey: PublicKey,
	tokenA: string,
	tokenB: string,
	fee: number
): Promise<Transaction> => {
	const tokenAKey = Key.newKey(`account-hash-${tokenA}`);
	const tokenBKey = Key.newKey(`account-hash-${tokenB}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.dex_contract_package_hash)
		.entryPoint('create_pool')
		.runtimeArgs(Args.fromMap({
			token_a: CLValue.newCLKey(tokenAKey),
			token_b: CLValue.newCLKey(tokenBKey),
			fee: CLValue.newCLUInt32(fee)
		}))
		.payment(CSPRToMotes(CREATE_POOL_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare initialize pool transaction
 * Sets the initial price for a newly created pool
 */
export const prepareInitializePoolTransaction = async (
	playerPublicKey: PublicKey,
	token0: string,
	token1: string,
	fee: number,
	sqrtPriceX96: string
): Promise<Transaction> => {
	const token0Key = Key.newKey(`account-hash-${token0}`);
	const token1Key = Key.newKey(`account-hash-${token1}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.dex_contract_package_hash)
		.entryPoint('initialize_pool')
		.runtimeArgs(Args.fromMap({
			token0: CLValue.newCLKey(token0Key),
			token1: CLValue.newCLKey(token1Key),
			fee: CLValue.newCLUInt32(fee),
			sqrt_price_x96: CLValue.newCLUInt256(sqrtPriceX96)
		}))
		.payment(CSPRToMotes(CREATE_POOL_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

// ============================================
// MOCK DATA HELPERS (for development/testing)
// ============================================

/**
 * Mock pool data for development
 */
export interface Pool {
	id: string;
	token0: string;
	token1: string;
	token0Symbol: string;
	token1Symbol: string;
	fee: number;
	sqrtPriceX96: string;
	tick: number;
	liquidity: string;
	volume24h: string;
	tvl: string;
}

/**
 * Get mock pool data
 */
export const getMockPools = (): Pool[] => {
	return [
		{
			id: '1',
			token0: config.wcspr_token_contract_hash,
			token1: config.usdt_token_contract_hash,
			token0Symbol: 'WCSPR',
			token1Symbol: 'USDT',
			fee: 3000,
			sqrtPriceX96: '2505414482898171603534460317184',
			tick: 0,
			liquidity: '10000000',
			volume24h: '125000',
			tvl: '500000',
		},
		{
			id: '2',
			token0: config.usdt_token_contract_hash,
			token1: config.cdai_token_contract_hash,
			token0Symbol: 'USDT',
			token1Symbol: 'CDAI',
			fee: 500,
			sqrtPriceX96: '79228162514264337593543950336',
			tick: 0,
			liquidity: '5000000',
			volume24h: '50000',
			tvl: '200000',
		},
	];
};

/**
 * Mock position data
 */
export interface Position {
	id: string;
	poolId: string;
	token0Symbol: string;
	token1Symbol: string;
	tickLower: number;
	tickUpper: number;
	liquidity: string;
	amount0: string;
	amount1: string;
	feesEarned0: string;
	feesEarned1: string;
}

/**
 * Get mock user positions
 */
export const getMockPositions = (): Position[] => {
	return [
		{
			id: '1',
			poolId: '1',
			token0Symbol: 'WCSPR',
			token1Symbol: 'USDT',
			tickLower: -600,
			tickUpper: 600,
			liquidity: '1000000',
			amount0: '10',
			amount1: '10000',
			feesEarned0: '0.1',
			feesEarned1: '100',
		},
	];
};

/**
 * Mock token balance
 */
export interface TokenBalance {
	symbol: string;
	contractHash: string;
	balance: string;
	decimals: number;
}

/**
 * Get mock token balances
 */
export const getMockTokenBalances = (): TokenBalance[] => {
	return [
		{
			symbol: 'WCSPR',
			contractHash: config.wcspr_token_contract_hash,
			balance: '1000',
			decimals: 18,
		},
		{
			symbol: 'USDT',
			contractHash: config.usdt_token_contract_hash,
			balance: '50000',
			decimals: 6,
		},
		{
			symbol: 'CDAI',
			contractHash: config.cdai_token_contract_hash,
			balance: '25000',
			decimals: 18,
		},
	];
};

// ============================================
// PRICE CALCULATION UTILITIES
// ============================================

/**
 * Fee tiers available in the DEX
 */
export const FEE_TIERS = [
	{ value: 500, label: '0.05%', description: 'Best for stable pairs', tickSpacing: 10 },
	{ value: 3000, label: '0.3%', description: 'Best for most pairs', tickSpacing: 60 },
	{ value: 10000, label: '1%', description: 'Best for exotic pairs', tickSpacing: 200 },
];

/**
 * Convert price to sqrtPriceX96 format
 * price = (sqrtPriceX96 / 2^96)^2
 * sqrtPriceX96 = sqrt(price) * 2^96
 */
export const priceToSqrtPriceX96 = (price: number): string => {
	const sqrtPrice = Math.sqrt(price);
	const Q96 = Math.pow(2, 96);
	const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Q96));
	return sqrtPriceX96.toString();
};

/**
 * Convert sqrtPriceX96 to human-readable price
 */
export const sqrtPriceX96ToPrice = (sqrtPriceX96: string): number => {
	const Q96 = Math.pow(2, 96);
	const sqrtPrice = Number(BigInt(sqrtPriceX96)) / Q96;
	return sqrtPrice * sqrtPrice;
};

/**
 * Calculate tick from price
 * tick = log_1.0001(price)
 */
export const priceToTick = (price: number): number => {
	return Math.floor(Math.log(price) / Math.log(1.0001));
};

/**
 * Calculate price from tick
 * price = 1.0001^tick
 */
export const tickToPrice = (tick: number): number => {
	return Math.pow(1.0001, tick);
};

/**
 * Round tick to nearest tick spacing
 */
export const roundTickToSpacing = (tick: number, tickSpacing: number): number => {
	return Math.round(tick / tickSpacing) * tickSpacing;
};

/**
 * Get tick spacing for fee tier
 */
export const getTickSpacing = (fee: number): number => {
	const tier = FEE_TIERS.find(t => t.value === fee);
	return tier?.tickSpacing || 60;
};

/**
 * Get available tokens for pool creation
 */
export const getAvailableTokensForPool = () => {
	return [
		{ symbol: 'TCSPR', name: 'Test Wrapped CSPR', contractHash: config.wcspr_token_contract_hash, decimals: 9 },
		{ symbol: 'USDT', name: 'Test USD Tether', contractHash: config.usdt_token_contract_hash, decimals: 6 },
		{ symbol: 'CDAI', name: 'Test Compound DAI', contractHash: config.cdai_token_contract_hash, decimals: 18 },
	];
};
