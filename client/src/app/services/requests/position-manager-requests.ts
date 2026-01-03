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
 * Position Manager Transaction Request Functions
 * These functions prepare transactions for Position Manager operations
 */

// Gas prices for Position Manager operations (in CSPR)
const MINT_POSITION_GAS = 20;
const DECREASE_LIQUIDITY_GAS = 15;
const COLLECT_GAS = 10;

/**
 * Mint parameters interface matching the Rust MintParams struct
 */
export interface MintParams {
	token0: string;
	token1: string;
	fee: number;
	tickLower: number;
	tickUpper: number;
	amount0Desired: string;
	amount1Desired: string;
	amount0Min: string;
	amount1Min: string;
	recipient: string;
	deadline: number;
}

/**
 * Prepare mint position transaction
 * Creates a new position NFT with liquidity
 */
export const prepareMintPositionTransaction = async (
	playerPublicKey: PublicKey,
	params: MintParams
): Promise<Transaction> => {
	const token0Key = Key.newKey(`account-hash-${params.token0}`);
	const token1Key = Key.newKey(`account-hash-${params.token1}`);
	const recipientKey = Key.newKey(`account-hash-${params.recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.position_manager_contract_package_hash)
		.entryPoint('mint')
		.runtimeArgs(Args.fromMap({
			token0: CLValue.newCLKey(token0Key),
			token1: CLValue.newCLKey(token1Key),
			fee: CLValue.newCLUInt32(params.fee),
			tick_lower: CLValue.newCLInt32(params.tickLower),
			tick_upper: CLValue.newCLInt32(params.tickUpper),
			amount0_desired: CLValue.newCLUInt256(params.amount0Desired),
			amount1_desired: CLValue.newCLUInt256(params.amount1Desired),
			amount0_min: CLValue.newCLUInt256(params.amount0Min),
			amount1_min: CLValue.newCLUInt256(params.amount1Min),
			recipient: CLValue.newCLKey(recipientKey),
			deadline: CLValue.newCLUint64(params.deadline)
		}))
		.payment(CSPRToMotes(MINT_POSITION_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare decrease liquidity transaction
 * Removes liquidity from an existing position
 */
export const prepareDecreaseLiquidityTransaction = async (
	playerPublicKey: PublicKey,
	tokenId: number,
	liquidity: string,
	amount0Min: string,
	amount1Min: string,
	deadline: number
): Promise<Transaction> => {
	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.position_manager_contract_package_hash)
		.entryPoint('decrease_liquidity')
		.runtimeArgs(Args.fromMap({
			token_id: CLValue.newCLUint64(tokenId),
			liquidity: CLValue.newCLUInt128(liquidity),
			amount0_min: CLValue.newCLUInt256(amount0Min),
			amount1_min: CLValue.newCLUInt256(amount1Min),
			deadline: CLValue.newCLUint64(deadline)
		}))
		.payment(CSPRToMotes(DECREASE_LIQUIDITY_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare collect transaction
 * Collects fees and tokens owed from a position
 */
export const prepareCollectTransaction = async (
	playerPublicKey: PublicKey,
	tokenId: number,
	recipient: string,
	amount0Max: string,
	amount1Max: string
): Promise<Transaction> => {
	const recipientKey = Key.newKey(`account-hash-${recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.position_manager_contract_package_hash)
		.entryPoint('collect')
		.runtimeArgs(Args.fromMap({
			token_id: CLValue.newCLUint64(tokenId),
			recipient: CLValue.newCLKey(recipientKey),
			amount0_max: CLValue.newCLUInt128(amount0Max),
			amount1_max: CLValue.newCLUInt128(amount1Max)
		}))
		.payment(CSPRToMotes(COLLECT_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

// ============================================
// MOCK DATA HELPERS (for development/testing)
// ============================================

/**
 * Position info interface matching the Rust PositionInfo struct
 */
export interface PositionInfo {
	token0: string;
	token1: string;
	fee: number;
	tickLower: number;
	tickUpper: number;
	liquidity: string;
}

/**
 * NFT Position interface for UI
 */
export interface NFTPosition {
	tokenId: number;
	owner: string;
	positionInfo: PositionInfo;
	token0Symbol: string;
	token1Symbol: string;
	amount0: string;
	amount1: string;
	feesEarned0: string;
	feesEarned1: string;
}

/**
 * Get mock NFT positions
 */
export const getMockNFTPositions = (): NFTPosition[] => {
	return [
		{
			tokenId: 1,
			owner: 'account-hash-1234567890abcdef',
			positionInfo: {
				token0: config.wcspr_token_contract_hash,
				token1: config.usdt_token_contract_hash,
				fee: 3000,
				tickLower: -600,
				tickUpper: 600,
				liquidity: '1000000'
			},
			token0Symbol: 'WCSPR',
			token1Symbol: 'USDT',
			amount0: '10',
			amount1: '10000',
			feesEarned0: '0.1',
			feesEarned1: '100'
		},
		{
			tokenId: 2,
			owner: 'account-hash-1234567890abcdef',
			positionInfo: {
				token0: config.usdt_token_contract_hash,
				token1: config.cdai_token_contract_hash,
				fee: 500,
				tickLower: -200,
				tickUpper: 200,
				liquidity: '500000'
			},
			token0Symbol: 'USDT',
			token1Symbol: 'CDAI',
			amount0: '5000',
			amount1: '5000',
			feesEarned0: '50',
			feesEarned1: '50'
		}
	];
};