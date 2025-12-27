use odra::{
    casper_types::{U256, U128},
};

/// Math for managing liquidity positions
/// Based on Uniswap V3's LiquidityMath.sol
pub struct LiquidityMath;

impl LiquidityMath {
    /// Add a signed liquidity delta to liquidity and revert if it overflows or underflows
    ///
    /// # Arguments
    /// * `liquidity` - The liquidity before change
    /// * `liquidity_delta` - The delta by which liquidity should be changed
    ///
    /// # Returns
    /// The liquidity after adding the delta
    pub fn add_delta(liquidity: U128, liquidity_delta: i128) -> U128 {
        if liquidity_delta < 0 {
            let delta_abs = liquidity_delta.unsigned_abs().into();
            assert!(
                liquidity >= delta_abs,
                "Liquidity underflow"
            );
            liquidity - delta_abs
        } else {
            let delta_abs = liquidity_delta.unsigned_abs().into();
            let result = liquidity.checked_add(delta_abs);
            assert!(result.is_some(), "Liquidity overflow");
            result.unwrap()
        }
    }

    /// Computes the maximum amount of liquidity received for a given amount of token0, token1
    /// and the prices at the tick boundaries
    ///
    /// # Arguments
    /// * `sqrt_ratio_x96` - A sqrt price representing the current pool prices
    /// * `sqrt_ratio_a_x96` - A sqrt price representing the lower tick boundary
    /// * `sqrt_ratio_b_x96` - A sqrt price representing the upper tick boundary
    /// * `amount0` - The amount of token0 being sent in
    /// * `amount1` - The amount of token1 being sent in
    ///
    /// # Returns
    /// The maximum liquidity that can be minted for the given amounts and price range
    pub fn get_liquidity_for_amounts(
        sqrt_ratio_x96: U256,
        sqrt_ratio_a_x96: U256,
        sqrt_ratio_b_x96: U256,
        amount0: U256,
        amount1: U256,
    ) -> U128 {
        let (sqrt_ratio_a_x96, sqrt_ratio_b_x96) = if sqrt_ratio_a_x96 > sqrt_ratio_b_x96 {
            (sqrt_ratio_b_x96, sqrt_ratio_a_x96)
        } else {
            (sqrt_ratio_a_x96, sqrt_ratio_b_x96)
        };

        if sqrt_ratio_x96 <= sqrt_ratio_a_x96 {
            // Current price is below the range, use only token0
            Self::get_liquidity_for_amount0(sqrt_ratio_a_x96, sqrt_ratio_b_x96, amount0)
        } else if sqrt_ratio_x96 < sqrt_ratio_b_x96 {
            // Current price is within the range, use both tokens
            let liquidity0 = Self::get_liquidity_for_amount0(sqrt_ratio_x96, sqrt_ratio_b_x96, amount0);
            let liquidity1 = Self::get_liquidity_for_amount1(sqrt_ratio_a_x96, sqrt_ratio_x96, amount1);

            // Return the minimum to ensure we don't exceed either token amount
            liquidity0.min(liquidity1)
        } else {
            // Current price is above the range, use only token1
            Self::get_liquidity_for_amount1(sqrt_ratio_a_x96, sqrt_ratio_b_x96, amount1)
        }
    }

    /// Computes the amount of liquidity received for a given amount of token0 and price range
    ///
    /// # Arguments
    /// * `sqrt_ratio_a_x96` - A sqrt price representing the lower tick boundary
    /// * `sqrt_ratio_b_x96` - A sqrt price representing the upper tick boundary
    /// * `amount0` - The amount of token0 being sent in
    ///
    /// # Returns
    /// The amount of liquidity minted for the given amount of token0
    pub fn get_liquidity_for_amount0(
        sqrt_ratio_a_x96: U256,
        sqrt_ratio_b_x96: U256,
        amount0: U256,
    ) -> U128 {
        let (sqrt_ratio_a_x96, sqrt_ratio_b_x96) = if sqrt_ratio_a_x96 > sqrt_ratio_b_x96 {
            (sqrt_ratio_b_x96, sqrt_ratio_a_x96)
        } else {
            (sqrt_ratio_a_x96, sqrt_ratio_b_x96)
        };

        let intermediate = (sqrt_ratio_a_x96 * sqrt_ratio_b_x96) >> 96;
        let liquidity = (amount0 * intermediate) / (sqrt_ratio_b_x96 - sqrt_ratio_a_x96);

        // Ensure it fits in U128
        let u128_max_as_u256 = (U256::one() << 128) - U256::one();
        assert!(liquidity <= u128_max_as_u256, "Liquidity overflow");
        U128::from(liquidity.as_u128())
    }

    /// Computes the amount of liquidity received for a given amount of token1 and price range
    ///
    /// # Arguments
    /// * `sqrt_ratio_a_x96` - A sqrt price representing the lower tick boundary
    /// * `sqrt_ratio_b_x96` - A sqrt price representing the upper tick boundary
    /// * `amount1` - The amount of token1 being sent in
    ///
    /// # Returns
    /// The amount of liquidity minted for the given amount of token1
    pub fn get_liquidity_for_amount1(
        sqrt_ratio_a_x96: U256,
        sqrt_ratio_b_x96: U256,
        amount1: U256,
    ) -> U128 {
        let (sqrt_ratio_a_x96, sqrt_ratio_b_x96) = if sqrt_ratio_a_x96 > sqrt_ratio_b_x96 {
            (sqrt_ratio_b_x96, sqrt_ratio_a_x96)
        } else {
            (sqrt_ratio_a_x96, sqrt_ratio_b_x96)
        };

        let liquidity = (amount1 << 96) / (sqrt_ratio_b_x96 - sqrt_ratio_a_x96);

        // Ensure it fits in U128
        let u128_max_as_u256 = (U256::one() << 128) - U256::one();
        assert!(liquidity <= u128_max_as_u256, "Liquidity overflow");
        U128::from(liquidity.as_u128())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::Q96;

    #[test]
    fn test_add_delta_positive() {
        let liquidity = 1000u128.into();
        let delta = 500i128;
        let result = LiquidityMath::add_delta(liquidity, delta);
        assert_eq!(result, 1500u128.into());
    }

    #[test]
    fn test_add_delta_negative() {
        let liquidity = 1000u128.into();
        let delta = -500i128;
        let result = LiquidityMath::add_delta(liquidity, delta);
        assert_eq!(result, 500u128.into());
    }

    #[test]
    fn test_add_delta_zero() {
        let liquidity = 1000u128.into();
        let delta = 0i128;
        let result = LiquidityMath::add_delta(liquidity, delta);
        assert_eq!(result, 1000u128.into());
    }

    #[test]
    #[should_panic(expected = "Liquidity underflow")]
    fn test_add_delta_underflow() {
        let liquidity = 100u128.into();
        let delta = -500i128;
        LiquidityMath::add_delta(liquidity, delta);
    }

    #[test]
    fn test_get_liquidity_for_amount0() {
        let sqrt_ratio_a = U256::from(Q96); // Price = 1
        let sqrt_ratio_b = U256::from(Q96 * 2); // Price = 4
        let amount0 = U256::from(1000000u64);

        let liquidity = LiquidityMath::get_liquidity_for_amount0(
            sqrt_ratio_a,
            sqrt_ratio_b,
            amount0,
        );

        assert!(liquidity > 0.into());
    }

    #[test]
    fn test_get_liquidity_for_amount1() {
        let sqrt_ratio_a = U256::from(Q96); // Price = 1
        let sqrt_ratio_b = U256::from(Q96 * 2); // Price = 4
        let amount1 = U256::from(1000000u64);

        let liquidity = LiquidityMath::get_liquidity_for_amount1(
            sqrt_ratio_a,
            sqrt_ratio_b,
            amount1,
        );

        assert!(liquidity > 0.into());
    }

    #[test]
    fn test_get_liquidity_for_amounts_below_range() {
        // Current price below range - should use only token0
        let current_price = U256::from(Q96 / 2);
        let lower_price = U256::from(Q96);
        let upper_price = U256::from(Q96 * 2);

        let liquidity = LiquidityMath::get_liquidity_for_amounts(
            current_price,
            lower_price,
            upper_price,
            U256::from(1000000u64),
            U256::from(1000000u64),
        );

        assert!(liquidity > 0.into());
    }

    #[test]
    fn test_get_liquidity_for_amounts_in_range() {
        // Current price in range - should use both tokens
        let current_price = U256::from(Q96);
        let lower_price = U256::from(Q96 / 2);
        let upper_price = U256::from(Q96 * 2);

        let liquidity = LiquidityMath::get_liquidity_for_amounts(
            current_price,
            lower_price,
            upper_price,
            U256::from(1000000u64),
            U256::from(1000000u64),
        );

        assert!(liquidity > 0.into());
    }

    #[test]
    fn test_get_liquidity_for_amounts_above_range() {
        // Current price above range - should use only token1
        let current_price = U256::from(Q96 * 4);
        let lower_price = U256::from(Q96);
        let upper_price = U256::from(Q96 * 2);

        let liquidity = LiquidityMath::get_liquidity_for_amounts(
            current_price,
            lower_price,
            upper_price,
            U256::from(1000000u64),
            U256::from(1000000u64),
        );

        assert!(liquidity > 0.into());
    }
}
