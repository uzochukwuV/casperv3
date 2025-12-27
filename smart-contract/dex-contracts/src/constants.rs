/// The minimum tick that may be passed to #getSqrtRatioAtTick computed from log base 1.0001 of 2**-128
pub const MIN_TICK: i32 = -887272;

/// The maximum tick that may be passed to #getSqrtRatioAtTick computed from log base 1.0001 of 2**128
pub const MAX_TICK: i32 = 887272;

/// The minimum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MIN_TICK)
pub const MIN_SQRT_RATIO: u128 = 4295128739;

/// The maximum value that can be returned from #getSqrtRatioAtTick. Equivalent to getSqrtRatioAtTick(MAX_TICK)
pub const MAX_SQRT_RATIO_STR: &str = "1461446703485210103287273052203988822378723970342";
/// 2^96 - Used for Q96.64 fixed point math
pub const Q96: u128 = 79228162514264337593543950336;

/// 2^128 - Used for fee calculations
pub const Q128_STR: &str = "340282366920938463463374607431768211456";

/// 2^192 - Used for intermediate calculations
pub const Q192: &str = "0x1000000000000000000000000000000000000000000000000";

/// One basis point (0.01%)
pub const ONE_BIP: u32 = 100;

/// Maximum fee (100%)
pub const MAX_FEE: u32 = 1_000_000;

/// Fee tier: 0.05% (5 bips)
pub const FEE_TIER_LOW: u32 = 500;
/// Fee tier: 0.30% (30 bips)
pub const FEE_TIER_MEDIUM: u32 = 3000;
/// Fee tier: 1.00% (100 bips)
pub const FEE_TIER_HIGH: u32 = 10000;

/// Tick spacing for 0.05% fee tier
pub const TICK_SPACING_LOW: i32 = 10;
/// Tick spacing for 0.30% fee tier
pub const TICK_SPACING_MEDIUM: i32 = 60;
/// Tick spacing for 1.00% fee tier
pub const TICK_SPACING_HIGH: i32 = 200;
