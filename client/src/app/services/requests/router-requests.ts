import {
	Args,
	CLValue,
	PublicKey,
	ContractCallBuilder,
	Transaction,
	Key,
	CLTypeBuilder,
} from 'casper-js-sdk';
import { CSPRToMotes } from '../../utils/currency';

/**
 * Router Transaction Request Functions
 * These functions prepare transactions for multi-hop swap operations
 */

// Gas prices for Router operations (in CSPR)
const SWAP_EXACT_INPUT_GAS = 25;
const SWAP_EXACT_OUTPUT_GAS = 30;

/**
 * Exact input parameters interface matching the Rust ExactInputParams struct
 */
export interface ExactInputParams {
	path: string[];           // [tokenIn, token1, token2, ..., tokenOut]
	fees: number[];           // [fee0, fee1, ...] - one less than path length
	recipient: string;
	deadline: number;
	amountIn: string;
	amountOutMinimum: string;
}

/**
 * Exact output parameters interface matching the Rust ExactOutputParams struct
 */
export interface ExactOutputParams {
	path: string[];           // [tokenOut, token2, token1, tokenIn] - REVERSED!
	fees: number[];           // [fee0, fee1, ...] - one less than path length
	recipient: string;
	deadline: number;
	amountOut: string;
	amountInMaximum: string;
}

/**
 * Prepare exact input multi-hop swap transaction
 * Example: Swap 100 WCSPR for at least 95 DAI via USDC
 */
export const prepareSwapExactInputMultiHopTransaction = async (
	playerPublicKey: PublicKey,
	params: ExactInputParams
): Promise<Transaction> => {
	const pathKeys = params.path.map(token => Key.newKey(`account-hash-${token}`));
	const recipientKey = Key.newKey(`account-hash-${params.recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.router_contract_package_hash)
		.entryPoint('swap_exact_input_multi_hop')
		.runtimeArgs(Args.fromMap({
			path: CLValue.newCLList(CLTypeBuilder.key(), pathKeys.map(key => CLValue.newCLKey(key))),
			fees: CLValue.newCLList(CLTypeBuilder.u32(), params.fees.map(fee => CLValue.newCLUInt32(fee))),
			recipient: CLValue.newCLKey(recipientKey),
			deadline: CLValue.newCLUint64(params.deadline),
			amount_in: CLValue.newCLUInt256(params.amountIn),
			amount_out_minimum: CLValue.newCLUInt256(params.amountOutMinimum)
		}))
		.payment(CSPRToMotes(SWAP_EXACT_INPUT_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};

/**
 * Prepare exact output multi-hop swap transaction
 * Example: Buy exactly 100 DAI for max 110 WCSPR via USDC
 */
export const prepareSwapExactOutputMultiHopTransaction = async (
	playerPublicKey: PublicKey,
	params: ExactOutputParams
): Promise<Transaction> => {
	const pathKeys = params.path.map(token => Key.newKey(`account-hash-${token}`));
	const recipientKey = Key.newKey(`account-hash-${params.recipient}`);

	return new ContractCallBuilder()
		.from(playerPublicKey)
		.byPackageHash(config.router_contract_package_hash)
		.entryPoint('swap_exact_output_multi_hop')
		.runtimeArgs(Args.fromMap({
			path: CLValue.newCLList(CLTypeBuilder.key(), pathKeys.map(key => CLValue.newCLKey(key))),
			fees: CLValue.newCLList(CLTypeBuilder.u32(), params.fees.map(fee => CLValue.newCLUInt32(fee))),
			recipient: CLValue.newCLKey(recipientKey),
			deadline: CLValue.newCLUint64(params.deadline),
			amount_out: CLValue.newCLUInt256(params.amountOut),
			amount_in_maximum: CLValue.newCLUInt256(params.amountInMaximum)
		}))
		.payment(CSPRToMotes(SWAP_EXACT_OUTPUT_GAS))
		.chainName(config.cspr_chain_name)
		.build();
};



// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate swap path and fees
 */
export const validateSwapPath = (path: string[], fees: number[]): boolean => {
	if (path.length < 2) {
		throw new Error('Path must contain at least 2 tokens');
	}
	if (fees.length !== path.length - 1) {
		throw new Error('Fees length must be path length - 1');
	}
	return true;
};

/**
 * Create deadline timestamp (current time + minutes)
 */
export const createDeadline = (minutesFromNow: number): number => {
	return Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
};

// ============================================
// MOCK DATA HELPERS (for development/testing)
// ============================================

/**
 * Swap route interface for UI
 */
export interface SwapRoute {
	path: string[];
	pathSymbols: string[];
	fees: number[];
	expectedOutput: string;
	priceImpact: string;
	gasEstimate: string;
}

/**
 * Get mock swap routes
 */
export const getMockSwapRoutes = (tokenIn: string, tokenOut: string): SwapRoute[] => {
	// Direct route
	const directRoute: SwapRoute = {
		path: [tokenIn, tokenOut],
		pathSymbols: ['WCSPR', 'USDT'],
		fees: [3000],
		expectedOutput: '950.123',
		priceImpact: '0.1%',
		gasEstimate: '10'
	};

	// Multi-hop route via USDC
	const multiHopRoute: SwapRoute = {
		path: [tokenIn, config.usdt_token_contract_hash, tokenOut],
		pathSymbols: ['WCSPR', 'USDT', 'DAI'],
		fees: [3000, 500],
		expectedOutput: '948.567',
		priceImpact: '0.15%',
		gasEstimate: '25'
	};

	return [directRoute, multiHopRoute];
};

/**
 * Popular trading pairs for router
 */
export const getPopularTradingPairs = () => {
	return [
		{
			tokenA: config.wcspr_token_contract_hash,
			tokenB: config.usdt_token_contract_hash,
			symbolA: 'WCSPR',
			symbolB: 'USDT',
			fee: 3000
		},
		{
			tokenA: config.usdt_token_contract_hash,
			tokenB: config.cdai_token_contract_hash,
			symbolA: 'USDT',
			symbolB: 'CDAI',
			fee: 500
		}
	];
};

/**
 * Example usage patterns
 */
export const getExampleSwaps = () => {
	return {
		exactInput: {
			description: 'Swap 100 WCSPR for at least 95 USDT',
			params: {
				path: [config.wcspr_token_contract_hash, config.usdt_token_contract_hash],
				fees: [3000],
				recipient: 'account-hash-user',
				deadline: createDeadline(20), // 20 minutes
				amountIn: '100000000000', // 100 WCSPR (9 decimals)
				amountOutMinimum: '95000000' // 95 USDT (6 decimals)
			}
		},
		exactOutput: {
			description: 'Buy exactly 100 USDT for max 110 WCSPR',
			params: {
				path: [config.usdt_token_contract_hash, config.wcspr_token_contract_hash], // Reversed!
				fees: [3000],
				recipient: 'account-hash-user',
				deadline: createDeadline(20),
				amountOut: '100000000', // 100 USDT (6 decimals)
				amountInMaximum: '110000000000' // 110 WCSPR (9 decimals)
			}
		},
		multiHop: {
			description: 'Swap WCSPR → USDT → DAI',
			params: {
				path: [config.wcspr_token_contract_hash, config.usdt_token_contract_hash, config.cdai_token_contract_hash],
				fees: [3000, 500],
				recipient: 'account-hash-user',
				deadline: createDeadline(20),
				amountIn: '100000000000', // 100 WCSPR
				amountOutMinimum: '90000000000000000000' // 90 DAI (18 decimals)
			}
		}
	};
};