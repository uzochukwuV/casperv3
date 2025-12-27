use odra::{
    casper_types::{U256, U512, bytesrepr::{ToBytes, FromBytes}},
};

/// Contains 512-bit math functions
/// Based on Uniswap V3's FullMath.sol
pub struct FullMath;

impl FullMath {
    /// Convert U256 to U512 by padding with zeros
    pub fn u256_to_u512(value: U256) -> U512 {
        // Serialize U256 to bytes (32 bytes)
        let mut bytes = value.to_bytes().expect("Failed to serialize U256");
        // Pad to 64 bytes for U512
        bytes.resize(64, 0);
        let (result, _) = U512::from_bytes(&bytes).expect("Failed to parse U512");
        result
    }

    /// Convert U512 to U256 (takes lower 256 bits)
    pub fn u512_to_u256(value: U512) -> U256 {
        let mut bytes = value.to_bytes().expect("Failed to serialize U512");
        // Pad to 64 bytes to safely slice the first 32
        bytes.resize(64, 0);
        // U512 is 64 bytes, U256 is 32 bytes - take first 32 bytes
        let (result, _) = U256::from_bytes(&bytes[..32]).expect("Failed to parse U256");
        result
    }

    /// Calculates floor(a×b÷denominator) with full precision
    /// Throws if result overflows a uint256 or denominator == 0
    ///
    /// # Arguments
    /// * `a` - The multiplicand
    /// * `b` - The multiplier
    /// * `denominator` - The divisor
    ///
    /// # Returns
    /// The 256-bit result
    pub fn mul_div(a: U256, b: U256, denominator: U256) -> U256 {
        assert!(!denominator.is_zero(), "Division by zero");

        // Use U512 to handle the full 512-bit product
        let product = Self::u256_to_u512(a) * Self::u256_to_u512(b);

        // Divide by the denominator
        let result = product / Self::u256_to_u512(denominator);

        // Ensure the result fits in U256
        let max_u256 = Self::u256_to_u512(U256::MAX);
        assert!(result <= max_u256, "Result overflow");

        Self::u512_to_u256(result)
    }

    /// Calculates ceil(a×b÷denominator) with full precision
    /// Throws if result overflows a uint256 or denominator == 0
    ///
    /// # Arguments
    /// * `a` - The multiplicand
    /// * `b` - The multiplier
    /// * `denominator` - The divisor
    ///
    /// # Returns
    /// The 256-bit result rounded up
    pub fn mul_div_rounding_up(a: U256, b: U256, denominator: U256) -> U256 {
        let result = Self::mul_div(a, b, denominator);
        let remainder = Self::mul_mod(a, b, denominator);

        if remainder.is_zero() {
            result
        } else {
            assert!(result < U256::MAX, "Result overflow on rounding up");
            result + U256::one()
        }
    }

    /// Calculates (a × b) % denominator
    ///
    /// # Arguments
    /// * `a` - The multiplicand
    /// * `b` - The multiplier
    /// * `denominator` - The divisor
    ///
    /// # Returns
    /// The remainder
    fn mul_mod(a: U256, b: U256, denominator: U256) -> U256 {
        assert!(!denominator.is_zero(), "Division by zero in mul_mod");
        let product = Self::u256_to_u512(a) * Self::u256_to_u512(b);
        let remainder = product % Self::u256_to_u512(denominator);
        Self::u512_to_u256(remainder)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mul_div_basic() {
        // Test: (10 * 20) / 5 = 40
        let result = FullMath::mul_div(
            U256::from(10u32),
            U256::from(20u32),
            U256::from(5u32),
        );
        assert_eq!(result, U256::from(40u32));
    }

    #[test]
    fn test_mul_div_floor() {
        // Test: (10 * 7) / 3 = 23 (floor)
        let result = FullMath::mul_div(
            U256::from(10u32),
            U256::from(7u32),
            U256::from(3u32),
        );
        assert_eq!(result, U256::from(23u32));
    }

    #[test]
    fn test_mul_div_rounding_up() {
        // Test: (10 * 7) / 3 = 24 (ceil)
        let result = FullMath::mul_div_rounding_up(
            U256::from(10u32),
            U256::from(7u32),
            U256::from(3u32),
        );
        assert_eq!(result, U256::from(24u32));
    }

    #[test]
    fn test_mul_div_no_rounding() {
        // Test exact division doesn't round up
        let result = FullMath::mul_div_rounding_up(
            U256::from(10u32),
            U256::from(6u32),
            U256::from(3u32),
        );
        assert_eq!(result, U256::from(20u32));
    }

    #[test]
    #[should_panic(expected = "Division by zero")]
    fn test_mul_div_zero_denominator() {
        FullMath::mul_div(
            U256::from(10u32),
            U256::from(20u32),
            U256::zero(),
        );
    }
}