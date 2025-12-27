use odra::{
    casper_types::U256,
};
use crate::{
    constants::{MIN_TICK, MAX_TICK, MIN_SQRT_RATIO, MAX_SQRT_RATIO_STR},
    math::full_math::FullMath,
};

/// Computes sqrt price for ticks
/// Based on Uniswap V3's TickMath.sol
pub struct TickMath;

impl TickMath {
    /// Calculates sqrt(1.0001^tick) * 2^96
    ///
    /// # Arguments
    /// * `tick` - The input tick for the above formula
    ///
    /// # Returns
    /// A Fixed point Q64.96 number representing the sqrt of the ratio of the two assets (token1/token0)
    /// at the given tick
    pub fn get_sqrt_ratio_at_tick(tick: i32) -> U256 {
        assert!(tick >= MIN_TICK && tick <= MAX_TICK, "Tick out of bounds");

        let abs_tick = if tick < 0 {
            (-(tick as i64)) as u32
        } else {
            tick as u32
        };

        // Precomputed values for sqrt(1.0001^(2^i)) * 2^128
        // These are the key values from Uniswap V3
        let mut ratio: U256 = if abs_tick & 0x1 != 0 {
            U256::from_str_radix("fffcb933bd6fad37aa2d162d1a594001", 16).unwrap()
        } else {
            U256::from(1u128) << 128
        };

        if abs_tick & 0x2 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("fff97272373d413259a46990580e213a", 16).unwrap());
        }
        if abs_tick & 0x4 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("fff2e50f5f656932ef12357cf3c7fdcc", 16).unwrap());
        }
        if abs_tick & 0x8 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("ffe5caca7e10e4e61c3624eaa0941cd0", 16).unwrap());
        }
        if abs_tick & 0x10 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("ffcb9843d60f6159c9db58835c926644", 16).unwrap());
        }
        if abs_tick & 0x20 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("ff973b41fa98c081472e6896dfb254c0", 16).unwrap());
        }
        if abs_tick & 0x40 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("ff2ea16466c96a3843ec78b326b52861", 16).unwrap());
        }
        if abs_tick & 0x80 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("fe5dee046a99a2a811c461f1969c3053", 16).unwrap());
        }
        if abs_tick & 0x100 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("fcbe86c7900a88aedcffc83b479aa3a4", 16).unwrap());
        }
        if abs_tick & 0x200 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("f987a7253ac413176f2b074cf7815e54", 16).unwrap());
        }
        if abs_tick & 0x400 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("f3392b0822b70005940c7a398e4b70f3", 16).unwrap());
        }
        if abs_tick & 0x800 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("e7159475a2c29b7443b29c7fa6e889d9", 16).unwrap());
        }
        if abs_tick & 0x1000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("d097f3bdfd2022b8845ad8f792aa5825", 16).unwrap());
        }
        if abs_tick & 0x2000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("a9f746462d870fdf8a65dc1f90e061e5", 16).unwrap());
        }
        if abs_tick & 0x4000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("70d869a156d2a1b890bb3df62baf32f7", 16).unwrap());
        }
        if abs_tick & 0x8000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("31be135f97d08fd981231505542fcfa6", 16).unwrap());
        }
        if abs_tick & 0x10000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("9aa508b5b7a84e1c677de54f3e99bc9", 16).unwrap());
        }
        if abs_tick & 0x20000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("5d6af8dedb81196699c329225ee604", 16).unwrap());
        }
        if abs_tick & 0x40000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("2216e584f5fa1ea926041bedfe98", 16).unwrap());
        }
        if abs_tick & 0x80000 != 0 {
            ratio = Self::mul_shift(ratio, U256::from_str_radix("48a170391f7dc42444e8fa2", 16).unwrap());
        }

        // If tick is negative, take reciprocal
        if tick > 0 {
            ratio = U256::MAX / ratio;
        }

        // Convert from Q128.128 to Q64.96 by right shifting 32 bits
        // Add 1 if there's a remainder to round up
        let shifted = ratio >> 32;
        let remainder = ratio & U256::from((1u64 << 32) - 1);

        if remainder.is_zero() {
            shifted
        } else {
            shifted + U256::one()
        }
    }

    /// Calculates the greatest tick value such that getRatioAtTick(tick) <= ratio
    ///
    /// # Arguments
    /// * `sqrt_price_x96` - The sqrt ratio for which to compute the tick as a Q64.96
    ///
    /// # Returns
    /// The greatest tick for which the ratio is less than or equal to the input ratio
    pub fn get_tick_at_sqrt_ratio(sqrt_price_x96: U256) -> i32 {
        assert!(
            sqrt_price_x96 >= U256::from(MIN_SQRT_RATIO) && sqrt_price_x96 < U256::from_dec_str(MAX_SQRT_RATIO_STR).unwrap(),
            "sqrt_price_x96 out of bounds"
        );

        // Use binary search to find the tick
        // This is simpler and more reliable than complex logarithm calculations
        let mut tick_low = MIN_TICK;
        let mut tick_high = MAX_TICK;

        while tick_low < tick_high {
            let tick_mid = (tick_low + tick_high + 1) / 2;
            let sqrt_ratio = Self::get_sqrt_ratio_at_tick(tick_mid);

            if sqrt_ratio == sqrt_price_x96 {
                return tick_mid;
            } else if sqrt_ratio < sqrt_price_x96 {
                tick_low = tick_mid;
            } else {
                tick_high = tick_mid - 1;
            }
        }

        tick_low
    }

    /// Helper function to multiply two U256 numbers and right shift by 128
    #[inline]
    fn mul_shift(a: U256, b: U256) -> U256 {
        FullMath::mul_div(a, b, U256::one() << 128)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_sqrt_ratio_at_tick_min() {
        let sqrt_price = TickMath::get_sqrt_ratio_at_tick(MIN_TICK);
        assert_eq!(sqrt_price, U256::from(MIN_SQRT_RATIO));
    }

    #[test]
    fn test_get_sqrt_ratio_at_tick_max() {
        let sqrt_price = TickMath::get_sqrt_ratio_at_tick(MAX_TICK);
        assert_eq!(sqrt_price,  U256::from_dec_str(MAX_SQRT_RATIO_STR).unwrap());
    }

    #[test]
    fn test_get_sqrt_ratio_at_tick_zero() {
        let sqrt_price = TickMath::get_sqrt_ratio_at_tick(0);
        // At tick 0, price = 1, so sqrt(price) * 2^96 = 2^96
        let expected = U256::from(1u128 << 96);
        assert_eq!(sqrt_price, expected);
    }

    #[test]
    fn test_tick_roundtrip() {
        // Note: MAX_TICK is excluded because get_sqrt_ratio_at_tick(MAX_TICK)
        // can return a value >= MAX_SQRT_RATIO due to rounding, which would fail
        // the bounds check in get_tick_at_sqrt_ratio.
        // In practice, MAX_TICK-1 is still very close to the maximum usable tick.
        let test_ticks = vec![MIN_TICK, -100, 0, 100, MAX_TICK - 1];

        for tick in test_ticks {
            let sqrt_price = TickMath::get_sqrt_ratio_at_tick(tick);
            let recovered_tick = TickMath::get_tick_at_sqrt_ratio(sqrt_price);

            // Should be within 1 tick due to rounding
            assert!(
                (recovered_tick - tick).abs() <= 1,
                "Roundtrip failed for tick {}: got {}, sqrt_price = {}",
                tick, recovered_tick, sqrt_price
            );
        }
    }

    #[test]
    #[should_panic(expected = "Tick out of bounds")]
    fn test_tick_too_low() {
        TickMath::get_sqrt_ratio_at_tick(MIN_TICK - 1);
    }

    #[test]
    #[should_panic(expected = "Tick out of bounds")]
    fn test_tick_too_high() {
        TickMath::get_sqrt_ratio_at_tick(MAX_TICK + 1);
    }
}
