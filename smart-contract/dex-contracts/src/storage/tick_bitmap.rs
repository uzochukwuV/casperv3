use odra::{
    casper_types::U256,
    prelude::*,
};
/// Stores a packed mapping of tick index to its initialized state
/// Allows gas-efficient iteration over initialized ticks
#[odra::module]
pub struct TickBitmap {
    /// word_position -> bitmap (256 ticks per word)
    bitmap: Mapping<i32, U256>,
}

#[odra::module]
impl TickBitmap {
    pub fn get_word(&self, tick: i32) -> U256 {
        self.bitmap.get_or_default(&tick)
    }

    /// Flips the initialized state for a given tick from false to true, or vice versa
    ///
    /// # Arguments
    /// * `tick` - The tick to flip
    /// * `tick_spacing` - The spacing between usable ticks
    pub fn flip_tick(&mut self, tick: i32, tick_spacing: i32) {
        assert!(tick % tick_spacing == 0, "Tick not aligned to spacing");

        let (word_pos, bit_pos) = Self::position(tick / tick_spacing);
        let mask = U256::one() << bit_pos;
        let mut word = self.bitmap.get_or_default(&word_pos);

        word ^= mask; // XOR flips the bit

        self.bitmap.set(&word_pos, word);
    }

    /// Returns the next initialized tick contained in the same word (or adjacent word) as the tick that is either
    /// to the left (less than or equal to) or right (greater than) of the given tick
    ///
    /// # Arguments
    /// * `tick` - The starting tick
    /// * `tick_spacing` - The spacing between usable ticks
    /// * `lte` - Whether to search for the next initialized tick to the left (less than or equal to the starting tick)
    ///
    /// # Returns
    /// * `next` - The next initialized or uninitialized tick up to 256 ticks away from the current tick
    /// * `initialized` - Whether the next tick is initialized
    pub fn next_initialized_tick_within_one_word(
        &self,
        tick: i32,
        tick_spacing: i32,
        lte: bool,
    ) -> (i32, bool) {
        let compressed = tick / tick_spacing;
        if tick < 0 && tick % tick_spacing != 0 {
            // Round towards negative infinity
            let _compressed = compressed - 1;
        }

        if lte {
            let (word_pos, bit_pos) = Self::position(compressed);
            // All the 1s at or to the right of the current bit_pos
            let mask = (U256::one() << bit_pos) - U256::one() + (U256::one() << bit_pos);
            let masked = self.bitmap.get_or_default(&word_pos) & mask;

            // If there are no initialized ticks to the right of or at the current tick, return rightmost in the word
            let initialized = !masked.is_zero();

            // Overflow/underflow is possible, but prevented externally by limiting both tick_spacing and tick
            let next = if initialized {
                (compressed - (bit_pos as i32 - Self::most_significant_bit(masked) as i32)) * tick_spacing
            } else {
                (compressed - bit_pos as i32) * tick_spacing
            };

            (next, initialized)
        } else {
            // Start from the word of the next tick, since the current tick state doesn't matter
            let (word_pos, bit_pos) = Self::position(compressed + 1);
            // All the 1s at or to the left of the bit_pos
            let mask = !((U256::one() << bit_pos) - U256::one());
            let masked = self.bitmap.get_or_default(&word_pos) & mask;

            // If there are no initialized ticks to the left of the current tick, return leftmost in the word
            let initialized = !masked.is_zero();

            // Overflow/underflow is possible, but prevented externally by limiting both tick_spacing and tick
            let next = if initialized {
                (compressed + 1 + (Self::least_significant_bit(masked) as i32 - bit_pos as i32)) * tick_spacing
            } else {
                (compressed + 1 + ((255 - bit_pos) as i32)) * tick_spacing
            };

            (next, initialized)
        }
    }
}

impl TickBitmap {
    /// Computes the position in the mapping where the initialized bit for a tick lives
    ///
    /// # Arguments
    /// * `tick` - The tick for which to compute the position
    ///
    /// # Returns
    /// * `word_pos` - The key in the mapping containing the word in which the bit is stored
    /// * `bit_pos` - The bit position in the word where the flag is stored
    pub fn position(tick: i32) -> (i32, u8) {
        let word_pos = tick >> 8; // tick / 256
        let bit_pos = (tick % 256) as u8;
        (word_pos, bit_pos)
    }

    /// Finds the most significant bit of a U256
    fn most_significant_bit(x: U256) -> u8 {
        assert!(!x.is_zero(), "Zero has no MSB");

        let mut r = 0u8;
        let mut x = x;

        if x >= (U256::one() << 128) {
            x >>= 128;
            r += 128;
        }
        if x >= (U256::one() << 64) {
            x >>= 64;
            r += 64;
        }
        if x >= (U256::one() << 32) {
            x >>= 32;
            r += 32;
        }
        if x >= (U256::one() << 16) {
            x >>= 16;
            r += 16;
        }
        if x >= (U256::one() << 8) {
            x >>= 8;
            r += 8;
        }
        if x >= (U256::one() << 4) {
            x >>= 4;
            r += 4;
        }
        if x >= (U256::one() << 2) {
            x >>= 2;
            r += 2;
        }
        if x >= (U256::one() << 1) {
            r += 1;
        }

        r
    }

    /// Finds the least significant bit of a U256
    fn least_significant_bit(x: U256) -> u8 {
        assert!(!x.is_zero(), "Zero has no LSB");

        let mut r = 255u8;
        let mut x = x;

        let u128_max_as_u256 = (U256::one() << 128) - U256::one();
        if x & u128_max_as_u256 > U256::zero() {
            r -= 128;
        } else {
            x >>= 128;
        }

        if x & U256::from(u64::MAX) > U256::zero() {
            r -= 64;
        } else {
            x >>= 64;
        }

        if x & U256::from(u32::MAX) > U256::zero() {
            r -= 32;
        } else {
            x >>= 32;
        }

        if x & U256::from(u16::MAX) > U256::zero() {
            r -= 16;
        } else {
            x >>= 16;
        }

        if x & U256::from(u8::MAX) > U256::zero() {
            r -= 8;
        } else {
            x >>= 8;
        }

        if x & U256::from(0xFu8) > U256::zero() {
            r -= 4;
        } else {
            x >>= 4;
        }

        if x & U256::from(0x3u8) > U256::zero() {
            r -= 2;
        } else {
            x >>= 2;
        }

        if x & U256::from(0x1u8) > U256::zero() {
            r -= 1;
        }

        r
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::NoArgs;
    use odra::host::Deployer;

    #[test]
    fn test_position() {
        let (word_pos, bit_pos) = TickBitmap::position(0);
        assert_eq!(word_pos, 0);
        assert_eq!(bit_pos, 0);

        let (word_pos, bit_pos) = TickBitmap::position(255);
        assert_eq!(word_pos, 0);
        assert_eq!(bit_pos, 255);

        let (word_pos, bit_pos) = TickBitmap::position(256);
        assert_eq!(word_pos, 1);
        assert_eq!(bit_pos, 0);

        let (word_pos, bit_pos) = TickBitmap::position(-256);
        assert_eq!(word_pos, -1);
        assert_eq!(bit_pos, 0);
    }

    #[test]
    fn test_flip_tick() {
        let env = odra_test::env();
        let mut bitmap = TickBitmap::deploy(&env, NoArgs);

        // Flip tick 0 (tick_spacing = 1)
        bitmap.flip_tick(0, 1);

        // Check it was flipped
        let (word_pos, _bit_pos) = TickBitmap::position(0);
        let word = bitmap.get_word(word_pos);
        assert_eq!(word, U256::one());

        // Flip again - should return to 0
        bitmap.flip_tick(0, 1);
        let word = bitmap.get_word(word_pos);
        assert_eq!(word, U256::zero());
    }

    #[test]
    fn test_most_significant_bit() {
        assert_eq!(TickBitmap::most_significant_bit(U256::one()), 0);
        assert_eq!(TickBitmap::most_significant_bit(U256::from(2u8)), 1);
        assert_eq!(TickBitmap::most_significant_bit(U256::from(4u8)), 2);
        assert_eq!(TickBitmap::most_significant_bit(U256::from(128u8)), 7);
        assert_eq!(TickBitmap::most_significant_bit(U256::from(255u8)), 7);
    }

    #[test]
    fn test_least_significant_bit() {
        assert_eq!(TickBitmap::least_significant_bit(U256::one()), 0);
        assert_eq!(TickBitmap::least_significant_bit(U256::from(2u8)), 1);
        assert_eq!(TickBitmap::least_significant_bit(U256::from(4u8)), 2);
        assert_eq!(TickBitmap::least_significant_bit(U256::from(128u8)), 7);
        assert_eq!(TickBitmap::least_significant_bit(U256::from(3u8)), 0); // 0b11 -> LSB is 0
    }
}
