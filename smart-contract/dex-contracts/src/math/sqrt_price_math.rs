use odra::{
    casper_types::{U128, U256, bytesrepr::{FromBytes, ToBytes}},
};
use crate::math::full_math::FullMath;
use crate::constants::Q96;

/// Contains the math that uses square root of price as a Q64.96 and liquidity to compute deltas
/// Based on Uniswap V3's SqrtPriceMath.sol
pub struct SqrtPriceMath;

impl SqrtPriceMath {
    /// Helper to convert U128 to U256
    fn u128_to_u256(val: U128) -> U256 {
        let bytes = val.to_bytes().expect("Failed to serialize U128");
        let (res, _) = U256::from_bytes(&bytes).expect("Failed to parse U256");
        res
    }

    /// Gets the next sqrt price given a delta of token0
    ///
    /// # Arguments
    /// * `sqrt_price_x96` - The starting price (Q64.96)
    /// * `liquidity` - The amount of usable liquidity
    /// * `amount` - How much of token0 to add or remove from virtual reserves
    /// * `add` - Whether to add or remove the amount of token0
    ///
    /// # Returns
    /// The price after adding or removing amount, depending on add
    pub fn get_next_sqrt_price_from_amount0_rounding_up(
        sqrt_price_x96: U256,
        liquidity: U128,
        amount: U256,
        add: bool,
    ) -> U256 {
        if amount.is_zero() {
            return sqrt_price_x96;
        }

        let numerator1 = Self::u128_to_u256(liquidity) << 96;

        if add {
            // If adding liquidity, round down to avoid giving too much
            let product = amount * sqrt_price_x96;
            let denominator = numerator1 + product;

            if denominator >= numerator1 {
                // No overflow
                return FullMath::mul_div_rounding_up(numerator1, sqrt_price_x96, denominator);
            }
        }

        // If removing liquidity or overflow, use different formula
        FullMath::mul_div_rounding_up(
            numerator1,
            U256::one(),
            (numerator1 / sqrt_price_x96) + amount,
        )
    }

    /// Gets the next sqrt price given a delta of token1
    ///
    /// # Arguments
    /// * `sqrt_price_x96` - The starting price (Q64.96)
    /// * `liquidity` - The amount of usable liquidity
    /// * `amount` - How much of token1 to add or remove from virtual reserves
    /// * `add` - Whether to add or remove the amount of token1
    ///
    /// # Returns
    /// The price after adding or removing amount, depending on add
    pub fn get_next_sqrt_price_from_amount1_rounding_down(
        sqrt_price_x96: U256,
        liquidity: U128,
        amount: U256,
        add: bool,
    ) -> U256 {
        if add {
            // If adding liquidity, compute new price directly
            let quotient = if amount <= Self::u128_to_u256(U128::MAX) {
                (amount << 96) / Self::u128_to_u256(liquidity)
            } else {
                FullMath::mul_div(amount, U256::from(Q96), Self::u128_to_u256(liquidity))
            };

            sqrt_price_x96 + quotient
        } else {
            // If removing liquidity
            let quotient = if amount <= Self::u128_to_u256(U128::MAX) {
                FullMath::mul_div_rounding_up(amount, U256::from(Q96), Self::u128_to_u256(liquidity))
            } else {
                FullMath::mul_div_rounding_up(amount, U256::from(Q96), Self::u128_to_u256(liquidity))
            };

            assert!(sqrt_price_x96 > quotient, "Price underflow");
            sqrt_price_x96 - quotient
        }
    }

    /// Gets the next sqrt price given an input amount of token0 or token1
    /// Throws if price or liquidity are 0, or if the next price is out of bounds
    ///
    /// # Arguments
    /// * `sqrt_price_x96` - The starting price (Q64.96)
    /// * `liquidity` - The amount of usable liquidity
    /// * `amount_in` - How much of token0 or token1 is being swapped in
    /// * `zero_for_one` - Whether the amount in is token0 or token1
    ///
    /// # Returns
    /// The price after adding the input amount
    pub fn get_next_sqrt_price_from_input(
        sqrt_price_x96: U256,
        liquidity: U128,
        amount_in: U256,
        zero_for_one: bool,
    ) -> U256 {
        assert!(!sqrt_price_x96.is_zero(), "sqrt_price_x96 is zero");
        assert!(!liquidity.is_zero(), "Liquidity is zero");

        if zero_for_one {
            Self::get_next_sqrt_price_from_amount0_rounding_up(
                sqrt_price_x96,
                liquidity,
                amount_in,
                true,
            )
        } else {
            Self::get_next_sqrt_price_from_amount1_rounding_down(
                sqrt_price_x96,
                liquidity,
                amount_in,
                true,
            )
        }
    }

    /// Gets the next sqrt price given an output amount of token0 or token1
    /// Throws if price or liquidity are 0, or if the next price is out of bounds
    ///
    /// # Arguments
    /// * `sqrt_price_x96` - The starting price (Q64.96)
    /// * `liquidity` - The amount of usable liquidity
    /// * `amount_out` - How much of token0 or token1 is being swapped out
    /// * `zero_for_one` - Whether the amount out is token0 or token1
    ///
    /// # Returns
    /// The price after removing the output amount
    pub fn get_next_sqrt_price_from_output(
        sqrt_price_x96: U256,
        liquidity: U128,
        amount_out: U256,
        zero_for_one: bool,
    ) -> U256 {
        assert!(!sqrt_price_x96.is_zero(), "sqrt_price_x96 is zero");
        assert!(!liquidity.is_zero(), "Liquidity is zero");

        if zero_for_one {
            Self::get_next_sqrt_price_from_amount1_rounding_down(
                sqrt_price_x96,
                liquidity,
                amount_out,
                false,
            )
        } else {
            Self::get_next_sqrt_price_from_amount0_rounding_up(
                sqrt_price_x96,
                liquidity,
                amount_out,
                false,
            )
        }
    }

    /// Gets the amount0 delta between two prices
    ///
    /// # Arguments
    /// * `sqrt_ratio_ax96` - A sqrt price (Q64.96)
    /// * `sqrt_ratio_bx96` - Another sqrt price (Q64.96)
    /// * `liquidity` - The amount of usable liquidity
    /// * `round_up` - Whether to round the amount up or down
    ///
    /// # Returns
    /// Amount of token0 required to cover a position of size liquidity between the two passed prices
    pub fn get_amount0_delta(
        sqrt_ratio_ax96: U256,
        sqrt_ratio_bx96: U256,
        liquidity: U128,
        round_up: bool,
    ) -> U256 {
        let (sqrt_ratio_ax96, sqrt_ratio_bx96) = if sqrt_ratio_ax96 > sqrt_ratio_bx96 {
            (sqrt_ratio_bx96, sqrt_ratio_ax96)
        } else {
            (sqrt_ratio_ax96, sqrt_ratio_bx96)
        };

        let numerator1 = Self::u128_to_u256(liquidity) << 96;
        let numerator2 = sqrt_ratio_bx96 - sqrt_ratio_ax96;

        assert!(!sqrt_ratio_ax96.is_zero(), "sqrt_ratio_ax96 is zero");

        if round_up {
            FullMath::mul_div_rounding_up(
                FullMath::mul_div_rounding_up(numerator1, numerator2, sqrt_ratio_bx96),
                U256::one(),
                sqrt_ratio_ax96,
            )
        } else {
            FullMath::mul_div(
                FullMath::mul_div(numerator1, numerator2, sqrt_ratio_bx96),
                U256::one(),
                sqrt_ratio_ax96,
            )
        }
    }

    /// Gets the amount1 delta between two prices
    ///
    /// # Arguments
    /// * `sqrt_ratio_ax96` - A sqrt price (Q64.96)
    /// * `sqrt_ratio_bx96` - Another sqrt price (Q64.96)
    /// * `liquidity` - The amount of usable liquidity
    /// * `round_up` - Whether to round the amount up or down
    ///
    /// # Returns
    /// Amount of token1 required to cover a position of size liquidity between the two passed prices
    pub fn get_amount1_delta(
        sqrt_ratio_ax96: U256,
        sqrt_ratio_bx96: U256,
        liquidity: U128,
        round_up: bool,
    ) -> U256 {
        let (sqrt_ratio_ax96, sqrt_ratio_bx96) = if sqrt_ratio_ax96 > sqrt_ratio_bx96 {
            (sqrt_ratio_bx96, sqrt_ratio_ax96)
        } else {
            (sqrt_ratio_ax96, sqrt_ratio_bx96)
        };

        let diff = sqrt_ratio_bx96 - sqrt_ratio_ax96;

        if round_up {
            FullMath::mul_div_rounding_up(Self::u128_to_u256(liquidity), diff, U256::from(Q96))
        } else {
            FullMath::mul_div(Self::u128_to_u256(liquidity), diff, U256::from(Q96))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_amount0_delta() {
        let sqrt_price_a = U256::from(Q96); // Price = 1
        let sqrt_price_b = U256::from(Q96 * 2); // Price = 4
        let liquidity = 1000000u128;

        let amount = SqrtPriceMath::get_amount0_delta(
            sqrt_price_a,
            sqrt_price_b,
            liquidity.into(),
            false,
        );

        assert!(amount > U256::zero());
    }

    #[test]
    fn test_get_amount1_delta() {
        let sqrt_price_a = U256::from(Q96); // Price = 1
        let sqrt_price_b = U256::from(Q96 * 2); // Price = 4
        let liquidity = 1000000u128;

        let amount = SqrtPriceMath::get_amount1_delta(
            sqrt_price_a,
            sqrt_price_b,
            liquidity.into(),
            false,
        );

        assert!(amount > U256::zero());
    }

    #[test]
    fn test_get_next_sqrt_price_from_input_zero_for_one() {
        let sqrt_price = U256::from(Q96);
        let liquidity = 1000000u128;
        let amount_in = U256::from(1000u32);

        let new_price = SqrtPriceMath::get_next_sqrt_price_from_input(
            sqrt_price,
            liquidity.into(),
            amount_in,
            true,
        );

        // Price should decrease when swapping token0 for token1
        assert!(new_price < sqrt_price);
    }

    #[test]
    fn test_get_next_sqrt_price_from_input_one_for_zero() {
        let sqrt_price = U256::from(Q96);
        let liquidity = 1000000u128;
        let amount_in = U256::from(1000u32);

        let new_price = SqrtPriceMath::get_next_sqrt_price_from_input(
            sqrt_price,
            liquidity.into(),
            amount_in,
            false,
        );

        // Price should increase when swapping token1 for token0
        assert!(new_price > sqrt_price);
    }

    #[test]
    #[should_panic(expected = "sqrt_price_x96 is zero")]
    fn test_get_next_sqrt_price_zero_price() {
        SqrtPriceMath::get_next_sqrt_price_from_input(
            U256::zero(),
            1000000u128.into(),
            U256::from(1000u32),
            true,
        );
    }

    #[test]
    #[should_panic(expected = "Liquidity is zero")]
    fn test_get_next_sqrt_price_zero_liquidity() {
        SqrtPriceMath::get_next_sqrt_price_from_input(
            U256::from(Q96),
            0u128.into(),
            U256::from(1000u32),
            true,
        );
    }
}
