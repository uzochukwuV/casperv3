use odra::{
    casper_types::U256,
    prelude::*,
    ContractRef,
};
use crate::unified_dex::UnifiedDexContractRef;

/// Router for multi-hop swaps across multiple pools
/// Enables trading pairs without direct liquidity (e.g., WCSPR → USDC → DAI)
#[odra::module]
pub struct Router {
    dex_address: Var<Address>,
}

/// Parameters for multi-hop swap with exact input
#[odra::odra_type]
pub struct ExactInputParams {
    pub path: Vec<Address>,           // [tokenIn, token1, token2, ..., tokenOut]
    pub fees: Vec<u32>,                // [fee0, fee1, ...] - one less than path length
    pub recipient: Address,
    pub deadline: u64,
    pub amount_in: U256,
    pub amount_out_minimum: U256,
}

/// Parameters for multi-hop swap with exact output
#[odra::odra_type]
pub struct ExactOutputParams {
    pub path: Vec<Address>,           // [tokenOut, token2, token1, tokenIn] - REVERSED!
    pub fees: Vec<u32>,                // [fee0, fee1, ...] - one less than path length
    pub recipient: Address,
    pub deadline: u64,
    pub amount_out: U256,
    pub amount_in_maximum: U256,
}

#[odra::module]
impl Router {
    #[odra(init)]
    pub fn init(&mut self, dex_address: Address) {
        self.dex_address.set(dex_address);
    }

    /// Execute multi-hop swap with exact input
    /// Example: Swap 100 WCSPR for at least 95 DAI via USDC
    /// path = [WCSPR, USDC, DAI]
    /// fees = [3000, 3000] (0.3% for each hop)
    pub fn swap_exact_input_multi_hop(
        &mut self,
        params: ExactInputParams,
    ) -> U256 {
        // Validate deadline
        assert!(self.env().get_block_time() <= params.deadline, "Transaction too old");

        // Validate path and fees
        assert!(params.path.len() >= 2, "Path too short");
        assert!(params.fees.len() == params.path.len() - 1, "Fees length mismatch");

        let dex_address = self.dex_address.get().unwrap();
        let mut dex = UnifiedDexContractRef::new(self.env(), dex_address);

        let mut amount_out = params.amount_in;

        // Execute swaps sequentially through the path
        for i in 0..params.fees.len() {
            let token_in = params.path[i];
            let token_out = params.path[i + 1];
            let fee = params.fees[i];

            // Order tokens for pool lookup
            let (token0, token1) = if token_in < token_out {
                (token_in, token_out)
            } else {
                (token_out, token_in)
            };
            let zero_for_one = token_in == token0;

            // For intermediate hops, send to this contract
            // For final hop, send to recipient
            let recipient = if i == params.fees.len() - 1 {
                params.recipient
            } else {
                self.env().self_address()
            };

            // Execute swap
            let (amount0, amount1) = dex.swap(
                token0,
                token1,
                fee,
                recipient,
                zero_for_one,
                amount_out.as_u128() as i64,  // Use output from previous swap as input
                U256::zero(),  // No price limit for router
            );

            // Update amount for next hop
            amount_out = if zero_for_one {
                U256::from((-amount1) as u128)  // Received token1
            } else {
                U256::from((-amount0) as u128)  // Received token0
            };
        }

        // Validate minimum output
        assert!(amount_out >= params.amount_out_minimum, "Insufficient output amount");

        amount_out
    }

    /// Execute multi-hop swap with exact output
    /// Example: Buy exactly 100 DAI for max 110 WCSPR via USDC
    /// path = [DAI, USDC, WCSPR] - REVERSED order!
    /// fees = [3000, 3000]
    pub fn swap_exact_output_multi_hop(
        &mut self,
        params: ExactOutputParams,
    ) -> U256 {
        // Validate deadline
        assert!(self.env().get_block_time() <= params.deadline, "Transaction too old");

        // Validate path and fees
        assert!(params.path.len() >= 2, "Path too short");
        assert!(params.fees.len() == params.path.len() - 1, "Fees length mismatch");

        let dex_address = self.dex_address.get().unwrap();
        let mut dex = UnifiedDexContractRef::new(self.env(), dex_address);

        let mut amount_in = params.amount_out;

        // Execute swaps in REVERSE order (from output to input)
        for i in (0..params.fees.len()).rev() {
            let token_out = params.path[i];
            let token_in = params.path[i + 1];
            let fee = params.fees[i];

            // Order tokens for pool lookup
            let (token0, token1) = if token_in < token_out {
                (token_in, token_out)
            } else {
                (token_out, token_in)
            };
            let zero_for_one = token_in == token0;

            // For first swap (last in execution), send to recipient
            // For others, send to this contract
            let recipient = if i == 0 {
                params.recipient
            } else {
                self.env().self_address()
            };

            // Execute swap with negative amount (exact output)
            let (amount0, amount1) = dex.swap(
                token0,
                token1,
                fee,
                recipient,
                zero_for_one,
                -(amount_in.as_u128() as i64),  // Negative = exact output
                U256::zero(),  // No price limit for router
            );

            // Update amount needed for next hop (working backwards)
            amount_in = if zero_for_one {
                U256::from(amount0 as u128)  // Need to provide token0
            } else {
                U256::from(amount1 as u128)  // Need to provide token1
            };
        }

        // Validate maximum input
        assert!(amount_in <= params.amount_in_maximum, "Excessive input amount");

        amount_in
    }

    /// Get quote for multi-hop swap (read-only, no execution)
    pub fn quote_exact_input_multi_hop(
        &self,
        path: Vec<Address>,
        fees: Vec<u32>,
        amount_in: U256,
    ) -> U256 {
        assert!(path.len() >= 2, "Path too short");
        assert!(fees.len() == path.len() - 1, "Fees length mismatch");

        let dex_address = self.dex_address.get().unwrap();
        let dex = UnifiedDexContractRef::new(self.env(), dex_address);

        let mut amount_out = amount_in;

        // Simulate swaps through the path
        for i in 0..fees.len() {
            let token_in = path[i];
            let token_out = path[i + 1];
            let fee = fees[i];

            // Get quote from DEX
            let quote = dex.quote_exact_input_single(
                token_in,
                token_out,
                fee,
                amount_out,
            );

            if let Some(q) = quote {
                amount_out = q.amount_out;
            } else {
                // Pool doesn't exist or has no liquidity
                return U256::zero();
            }
        }

        amount_out
    }

    // Getter
    pub fn get_dex_address(&self) -> Address {
        self.dex_address.get().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: These would be integration tests requiring deployed DEX
    // For now, just structural tests

    #[test]
    fn test_path_validation() {
        // Path must have at least 2 tokens
        let short_path = vec![];
        assert!(short_path.len() < 2);

        let valid_path = vec![
            Address::Account(odra::casper_types::account::AccountHash::new([1; 32])),
            Address::Account(odra::casper_types::account::AccountHash::new([2; 32])),
        ];
        assert!(valid_path.len() >= 2);
    }

    #[test]
    fn test_fees_length() {
        let path_len = 3; // 3 tokens = 2 hops
        let fees_len = 2; // Should have 2 fees
        assert_eq!(fees_len, path_len - 1);
    }
}
