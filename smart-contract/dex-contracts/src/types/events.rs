use odra::prelude::*;
use odra::casper_types::{U256, U128};
use crate::types::tick::I128;

#[odra::event]
pub struct Initialize {
    pub sqrt_price_x96: U256,
    pub tick: i32,
}

#[odra::event]
pub struct Mint {
    pub sender: Address,
    pub owner: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount: U128,
    pub amount0: U256,
    pub amount1: U256,
}

#[odra::event]
pub struct Collect {
    pub owner: Address,
    pub recipient: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount0: U128,
    pub amount1: U128,
}

#[odra::event]
pub struct Burn {
    pub owner: Address,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount: U128,
    pub amount0: U256,
    pub amount1: U256,
}

#[odra::event]
pub struct Swap {
    pub sender: Address,
    pub recipient: Address,
    pub amount0: I128,
    pub amount1: I128,
    pub sqrt_price_x96: U256,
    pub liquidity: U128,
    pub tick: i32,
}

#[odra::event]
pub struct Flash {
    pub sender: Address,
    pub recipient: Address,
    pub amount0: U256,
    pub amount1: U256,
    pub paid0: U256,
    pub paid1: U256,
}

#[odra::event]
pub struct IncreaseObservationCardinalityNext {
    pub observation_cardinality_next_old: u32,
    pub observation_cardinality_next_new: u32,
}

#[odra::event]
pub struct SetFeeProtocol {
    pub fee_protocol_0_old: u8,
    pub fee_protocol_1_old: u8,
    pub fee_protocol_0_new: u8,
    pub fee_protocol_1_new: u8,
}

#[odra::event]
pub struct CollectProtocol {
    pub sender: Address,
    pub recipient: Address,
    pub amount0: U128,
    pub amount1: U128,
}

#[odra::event]
pub struct PoolCreated {
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub tick_spacing: i32,
    pub pool: Address,
}