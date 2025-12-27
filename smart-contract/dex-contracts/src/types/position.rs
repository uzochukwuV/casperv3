use odra::{
    casper_types::{U128, U256},
    prelude::*,
};

/// Positions represent an owner address' liquidity between a lower and upper tick boundary
#[odra::odra_type]
#[derive(Default)]
pub struct Position {
    /// The amount of liquidity owned by this position
    pub liquidity: U128,

    /// Fee growth per unit of liquidity as of the last update to liquidity or fees owed
    pub fee_growth_inside_0_last_x128: U256,
    pub fee_growth_inside_1_last_x128: U256,

    /// The fees owed to the position owner in token0/token1
    pub tokens_owed_0: U128,
    pub tokens_owed_1: U128,
}

/// Key for identifying a unique position
#[odra::odra_type]
#[derive(Hash)]
pub struct PositionKey {
    /// The owner of the position
    pub owner: Address,
    /// The lower tick of the position
    pub tick_lower: i32,
    /// The upper tick of the position
    pub tick_upper: i32,
}

impl PositionKey {
    /// Creates a new position key
    pub fn new(owner: Address, tick_lower: i32, tick_upper: i32) -> Self {
        Self {
            owner,
            tick_lower,
            tick_upper,
        }
    }

    /// Computes the hash of the position key (for use as mapping key)
    pub fn compute_key(&self) -> [u8; 32] {
        use odra::casper_types::bytesrepr::ToBytes;

        let mut key_bytes = Vec::new();
        key_bytes.extend_from_slice(&self.owner.to_bytes().unwrap());
        key_bytes.extend_from_slice(&self.tick_lower.to_le_bytes());
        key_bytes.extend_from_slice(&self.tick_upper.to_le_bytes());

        // Simple hash - in production use a proper hash function like blake2b
        let mut hash = [0u8; 32];
        for (i, byte) in key_bytes.iter().enumerate() {
            hash[i % 32] ^= byte;
        }
        hash
    }
}

impl Position {
    /// Updates position with new liquidity
    ///
    /// # Arguments
    /// * `liquidity_delta` - Change in liquidity
    /// * `fee_growth_inside_0_x128` - Fee growth inside the position for token0
    /// * `fee_growth_inside_1_x128` - Fee growth inside the position for token1
    pub fn update(
        &mut self,
        liquidity_delta: i128,
        fee_growth_inside_0_x128: U256,
        fee_growth_inside_1_x128: U256,
    ) {
        // Calculate fees owed before updating position
        if liquidity_delta == 0 {
            // If no liquidity change, just collect fees
            assert!(!self.liquidity.is_zero(), "Cannot update position with 0 liquidity");
        } else {
            self.liquidity = if liquidity_delta < 0 {
                self.liquidity - liquidity_delta.unsigned_abs()
            } else {
                self.liquidity + liquidity_delta.unsigned_abs()
            };
        }

        // Calculate and accumulate fees
        let tokens_owed_0 = Self::calculate_fees_owed(
            self.liquidity,
            fee_growth_inside_0_x128,
            self.fee_growth_inside_0_last_x128,
        );
        let tokens_owed_1 = Self::calculate_fees_owed(
            self.liquidity,
            fee_growth_inside_1_x128,
            self.fee_growth_inside_1_last_x128,
        );

        self.tokens_owed_0 += tokens_owed_0;
        self.tokens_owed_1 += tokens_owed_1;

        // Update fee growth checkpoints
        self.fee_growth_inside_0_last_x128 = fee_growth_inside_0_x128;
        self.fee_growth_inside_1_last_x128 = fee_growth_inside_1_x128;
    }

    /// Calculates fees owed to the position
    fn calculate_fees_owed(
        liquidity: U128,
        fee_growth_inside: U256,
        fee_growth_inside_last: U256,
    ) -> U128 {
        let fee_growth_delta = fee_growth_inside - fee_growth_inside_last;
        let liquidity_u256 = U256::from(liquidity.as_u128());
        let fees = (liquidity_u256 * fee_growth_delta) >> 128;

        // Ensure fees fit in U128
        let u128_max_as_u256 = (U256::one() << 128) - U256::one();
        assert!(fees <= u128_max_as_u256, "Fees overflow");
        fees.as_u128().into()
    }

    /// Gets the current fees owed without updating the position
    pub fn get_fees_owed(
        &self,
        fee_growth_inside_0_x128: U256,
        fee_growth_inside_1_x128: U256,
    ) -> (U128, U128) {
        let tokens_owed_0 = self.tokens_owed_0 + Self::calculate_fees_owed(
            self.liquidity,
            fee_growth_inside_0_x128,
            self.fee_growth_inside_0_last_x128,
        );
        let tokens_owed_1 = self.tokens_owed_1 + Self::calculate_fees_owed(
            self.liquidity,
            fee_growth_inside_1_x128,
            self.fee_growth_inside_1_last_x128,
        );

        (tokens_owed_0, tokens_owed_1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::casper_types::account::AccountHash;

    #[test]
    fn test_position_key_new() {
        let owner = Address::from(AccountHash::new([1u8; 32]));
        let key = PositionKey::new(owner, -100, 100);

        assert_eq!(key.owner, owner);
        assert_eq!(key.tick_lower, -100);
        assert_eq!(key.tick_upper, 100);
    }

    #[test]
    fn test_position_update_add_liquidity() {
        let mut position = Position::default();

        position.update(1000, U256::zero(), U256::zero());

        assert_eq!(position.liquidity, 1000u128.into());
    }

    #[test]
    fn test_position_update_remove_liquidity() {
        let mut position = Position {
            liquidity: 1000u128.into(),
            ..Default::default()
        };

        position.update(-500, U256::zero(), U256::zero());

        assert_eq!(position.liquidity, 500u128.into());
    }

    #[test]
    fn test_position_calculate_fees() {
        let mut position = Position {
            liquidity: 1000u128.into(),
            fee_growth_inside_0_last_x128: U256::zero(),
            fee_growth_inside_1_last_x128: U256::zero(),
            ..Default::default()
        };

        // Simulate fee growth
        let fee_growth = U256::one() << 128; // 1.0 in Q128
        position.update(0, fee_growth, fee_growth);

        assert_eq!(position.tokens_owed_0, 1000u128.into());
        assert_eq!(position.tokens_owed_1, 1000u128.into());
    }
}
