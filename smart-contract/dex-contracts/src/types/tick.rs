use odra::{
    casper_types::{U256, U128},
};

/// Custom I128 wrapper since i128 is not supported in Casper serialization
#[odra::odra_type]
#[derive(Default)]
pub struct I128 {
    pub abs: U128,
    pub is_positive: bool,
}

impl I128 {
    pub fn from_i128(val: i128) -> Self {
        Self {
            abs: U128::from(val.unsigned_abs()),
            is_positive: val >= 0,
        }
    }

    pub fn as_i128(&self) -> i128 {
        let val = self.abs.as_u128() as i128;
        if self.is_positive {
            val
        } else {
            -val
        }
    }
}

/// Info stored for each initialized individual tick
#[odra::odra_type]
#[derive(Default)]
pub struct Tick {
    /// The total position liquidity that references this tick
    pub liquidity_gross: U128,

    /// Amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left)
    pub liquidity_net: I128,

    /// Fee growth per unit of liquidity on the _other_ side of this tick (relative to the current tick)
    /// Only has relative meaning, not absolute — the value depends on when the tick is initialized
    pub fee_growth_outside_0_x128: U256,
    pub fee_growth_outside_1_x128: U256,

    /// The cumulative tick value on the other side of the tick
    pub tick_cumulative_outside: i64,

    /// The seconds per unit of liquidity on the _other_ side of this tick (relative to the current tick)
    /// Only has relative meaning, not absolute — the value depends on when the tick is initialized
    pub seconds_per_liquidity_outside_x128: U256,

    /// The seconds spent on the other side of the tick (relative to the current tick)
    /// Only has relative meaning, not absolute — the value depends on when the tick is initialized
    pub seconds_outside: u32,

    /// True iff the tick is initialized, i.e. the value is exactly equivalent to the expression liquidityGross != 0
    /// These 8 bits are set to prevent fresh sstores when crossing newly initialized ticks
    pub initialized: bool,
}

impl Tick {
    /// Updates a tick and returns true if the tick was flipped from initialized to uninitialized, or vice versa
    ///
    /// # Arguments
    /// * `tick` - The tick to update
    /// * `tick_current` - The current tick
    /// * `liquidity_delta` - Change in liquidity
    /// * `fee_growth_global_0_x128` - Global fee growth for token0
    /// * `fee_growth_global_1_x128` - Global fee growth for token1
    /// * `seconds_per_liquidity_cumulative_x128` - The all-time seconds per liquidity
    /// * `tick_cumulative` - The all-time tick cumulative
    /// * `time` - The current block timestamp
    /// * `upper` - Whether the tick is an upper tick
    /// * `max_liquidity` - The maximum liquidity allocation for a single tick
    ///
    /// # Returns
    /// True if the tick was flipped from initialized to uninitialized, or vice versa
    pub fn update(
        &mut self,
        tick: i32,
        tick_current: i32,
        liquidity_delta: i128,
        fee_growth_global_0_x128: U256,
        fee_growth_global_1_x128: U256,
        seconds_per_liquidity_cumulative_x128: U256,
        tick_cumulative: i64,
        time: u32,
        upper: bool,
        max_liquidity: U128,
    ) -> bool {
        let liquidity_gross_before = self.liquidity_gross;
        let liquidity_gross_after = if liquidity_delta < 0 {
            self.liquidity_gross - liquidity_delta.unsigned_abs()
        } else {
            self.liquidity_gross + liquidity_delta.unsigned_abs()
        };

        assert!(liquidity_gross_after <= max_liquidity, "Liquidity > max");

        let flipped = liquidity_gross_after.is_zero() != liquidity_gross_before.is_zero();

        if liquidity_gross_before.is_zero() {
            // By convention, we assume that all growth before a tick was initialized happened _below_ the tick
            if tick <= tick_current {
                self.fee_growth_outside_0_x128 = fee_growth_global_0_x128;
                self.fee_growth_outside_1_x128 = fee_growth_global_1_x128;
                self.seconds_per_liquidity_outside_x128 = seconds_per_liquidity_cumulative_x128;
                self.tick_cumulative_outside = tick_cumulative;
                self.seconds_outside = time;
            }
            self.initialized = true;
        }

        self.liquidity_gross = liquidity_gross_after;

        // When the lower (upper) tick is crossed left to right (right to left), liquidity must be added (removed)
        let liquidity_net_i128 = self.liquidity_net.as_i128();
        let new_liquidity_net = if upper {
            liquidity_net_i128 - liquidity_delta
        } else {
            liquidity_net_i128 + liquidity_delta
        };
        self.liquidity_net = I128::from_i128(new_liquidity_net);

        flipped
    }

    /// Clears tick data
    pub fn clear(&mut self) {
        *self = Tick::default();
    }

    /// Transitions to next tick as needed by price movement
    ///
    /// # Arguments
    /// * `fee_growth_global_0_x128` - The all-time global fee growth for token0
    /// * `fee_growth_global_1_x128` - The all-time global fee growth for token1
    /// * `seconds_per_liquidity_cumulative_x128` - The all-time seconds per liquidity
    /// * `tick_cumulative` - The all-time tick cumulative
    /// * `time` - The current block timestamp
    ///
    /// # Returns
    /// The amount of liquidity added (subtracted) when tick is crossed from left to right (right to left)
    pub fn cross(
        &mut self,
        fee_growth_global_0_x128: U256,
        fee_growth_global_1_x128: U256,
        seconds_per_liquidity_cumulative_x128: U256,
        tick_cumulative: i64,
        time: u32,
    ) -> i128 {
        self.fee_growth_outside_0_x128 = fee_growth_global_0_x128 - self.fee_growth_outside_0_x128;
        self.fee_growth_outside_1_x128 = fee_growth_global_1_x128 - self.fee_growth_outside_1_x128;
        self.seconds_per_liquidity_outside_x128 = seconds_per_liquidity_cumulative_x128 - self.seconds_per_liquidity_outside_x128;
        self.tick_cumulative_outside = tick_cumulative - self.tick_cumulative_outside;
        self.seconds_outside = time - self.seconds_outside;
        self.liquidity_net.as_i128()
    }
}
