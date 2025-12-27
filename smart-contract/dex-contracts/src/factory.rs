use odra::{
    prelude::*,
};
use odra_modules::access::Ownable;
use crate::{
    types::PoolCreated,
};

#[odra::odra_type]
pub struct PoolCreationArgs {
    pub factory: Address,
    pub token0: Address,
    pub token1: Address,
    pub fee: u32,
    pub tick_spacing: i32,
}

#[odra::external_contract]
pub trait IFactory {
    fn get_pool(&self, token_a: Address, token_b: Address, fee: u32) -> Option<Address>;
    fn register_pool(&mut self, pool_address: Address, token_a: Address, token_b: Address, fee: u32);
}

#[odra::module]
pub struct Factory {
    ownable: SubModule<Ownable>,
    // Mapping from (token0, token1, fee) to pool address
    pools: Mapping<(Address, Address, u32), Address>,
    // Mapping from fee to tick_spacing (0 means disabled)
    fee_amount_tick_spacing: Mapping<u32, i32>,
}

#[odra::module]
impl Factory {
    #[odra(init)]
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.ownable.init(caller);
        // Initialize default fee tiers
        // 0.05% -> 10
        self.fee_amount_tick_spacing.set(&500, 10);
        // 0.3% -> 60
        self.fee_amount_tick_spacing.set(&3000, 60);
        // 1% -> 200
        self.fee_amount_tick_spacing.set(&10000, 200);
    }

    /// Register a manually deployed pool
    ///
    /// This is a workaround for Odra's limitation with on-chain contract deployment.
    /// Pools must be deployed externally and then registered with the factory.
    ///
    /// # Arguments
    /// * `pool_address` - Address of the already-deployed pool contract
    /// * `token_a` - First token address
    /// * `token_b` - Second token address
    /// * `fee` - Fee tier (e.g., 3000 = 0.3%)
    ///
    /// # Security
    /// Only the factory owner can register pools to prevent malicious pool registration
    pub fn register_pool(
        &mut self,
        pool_address: Address,
        token_a: Address,
        token_b: Address,
        fee: u32,
    ) {
        // Only owner can register pools (security measure)
        self.ownable.assert_owner(&self.env().caller());

        assert!(token_a != token_b, "Identical addresses");
        let (token0, token1) = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };
        assert!(token0 != Address::Account(odra::casper_types::account::AccountHash::new([0; 32])), "Zero address");

        let tick_spacing = self.fee_amount_tick_spacing.get(&fee).unwrap_or(0);
        assert!(tick_spacing != 0, "Fee not enabled");

        let pool_key = (token0, token1, fee);
        assert!(self.pools.get(&pool_key).is_none(), "Pool already exists");

        self.pools.set(&pool_key, pool_address);

        self.env().emit_event(PoolCreated {
            token0,
            token1,
            fee,
            tick_spacing,
            pool: pool_address,
        });
    }

    /// Legacy create_pool function that returns the expected PoolInitArgs
    ///
    /// This function is kept for API compatibility but returns initialization
    /// parameters instead of deploying. The caller should:
    /// 1. Call this to get init args
    /// 2. Deploy the pool contract with these args
    /// 3. Call register_pool() to complete the process
    pub fn create_pool(
        &mut self,
        token_a: Address,
        token_b: Address,
        fee: u32,
    ) -> PoolCreationArgs {
        assert!(token_a != token_b, "Identical addresses");
        let (token0, token1) = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };
        assert!(token0 != Address::Account(odra::casper_types::account::AccountHash::new([0; 32])), "Zero address");

        let tick_spacing = self.fee_amount_tick_spacing.get(&fee).unwrap_or(0);
        assert!(tick_spacing != 0, "Fee not enabled");

        let pool_key = (token0, token1, fee);
        assert!(self.pools.get(&pool_key).is_none(), "Pool already exists");

        PoolCreationArgs {
            factory: self.env().self_address(),
            token0,
            token1,
            fee,
            tick_spacing,
        }
    }

    pub fn enable_fee_amount(&mut self, fee: u32, tick_spacing: i32) {
        self.ownable.assert_owner(&self.env().caller());
        assert!(fee < 1000000, "Fee too high");
        assert!(tick_spacing > 0 && tick_spacing < 16384, "Invalid tick spacing");
        assert!(self.fee_amount_tick_spacing.get(&fee).is_none(), "Fee already enabled");

        self.fee_amount_tick_spacing.set(&fee, tick_spacing);
    }

    pub fn get_pool(&self, token_a: Address, token_b: Address, fee: u32) -> Option<Address> {
        let (token0, token1) = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };
        self.pools.get(&(token0, token1, fee))
    }
}