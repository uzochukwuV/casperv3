/// Integration test demonstrating full DEX deployment workflow
use odra::host::{Deployer, NoArgs};
use odra::casper_types::U256;
use dex_contracts::{
    factory::Factory,
    pool::{Pool, PoolInitArgs},
    position_manager::{PositionManager, PositionManagerInitArgs},
};

#[test]
fn test_full_dex_deployment() {
    let env = odra_test::env();

    println!("\n=== CasperSwap V3 DEX Deployment Test ===\n");

    // Step 1: Deploy Factory
    println!("1. Deploying Factory...");
    let mut factory = Factory::deploy(&env, NoArgs);
    println!("   ✓ Factory deployed at: {:?}", factory.address());

    // Step 2: Create Pool initialization args
    println!("\n2. Creating Pool initialization args...");

    // Mock token addresses for testing
    let token0_addr = env.get_account(10); // Mock CSPR
    let token1_addr = env.get_account(11); // Mock USDC

    let pool_args = PoolInitArgs {
        factory: factory.address(),
        token0: token0_addr,
        token1: token1_addr,
        fee: 3000,  // 0.3%
        tick_spacing: 60,
    };
    println!("   ✓ Pool args created:");
    println!("     - Token0: {:?}", token0_addr);
    println!("     - Token1: {:?}", token1_addr);
    println!("     - Fee: 3000 (0.3%)");
    println!("     - Tick Spacing: 60");

    // Step 3: Deploy Pool
    println!("\n3. Deploying Pool...");
    let mut pool = Pool::deploy(&env, pool_args);
    println!("   ✓ Pool deployed at: {:?}", pool.address());

    // Step 4: Initialize Pool with 1:1 price
    println!("\n4. Initializing Pool with 1:1 price...");
    let sqrt_price = U256::from(1u128 << 96); // sqrt(1) * 2^96
    pool.initialize(sqrt_price);
    println!("   ✓ Pool initialized with sqrt_price_x96: {}", sqrt_price);

    // Step 5: Register Pool with Factory
    println!("\n5. Registering Pool with Factory...");
    factory.register_pool(
        pool.address(),
        token0_addr,
        token1_addr,
        3000,
    );
    println!("   ✓ Pool registered");

    // Step 6: Verify registration
    println!("\n6. Verifying Pool registration...");
    let registered_pool = factory.get_pool(token0_addr, token1_addr, 3000);
    assert_eq!(registered_pool, Some(pool.address()));
    println!("   ✓ Pool lookup successful: {:?}", registered_pool.unwrap());

    // Step 7: Deploy PositionManager
    println!("\n7. Deploying PositionManager...");
    let pos_manager_args = PositionManagerInitArgs {
        factory: factory.address(),
    };
    let mut pos_manager = PositionManager::deploy(&env, pos_manager_args);
    println!("   ✓ PositionManager deployed at: {:?}", pos_manager.address());

    println!("\n=== Deployment Summary ===");
    println!("Factory:          {:?}", factory.address());
    println!("Pool (CSPR/USDC): {:?}", pool.address());
    println!("PositionManager:  {:?}", pos_manager.address());
    println!("\n✓ All components deployed successfully!\n");
}

#[test]
fn test_multiple_pools_deployment() {
    let env = odra_test::env();

    println!("\n=== Testing Multiple Pool Deployment ===\n");

    // Deploy Factory
    let mut factory = Factory::deploy(&env, NoArgs);
    println!("Factory deployed: {:?}", factory.address());

    // Create 3 different pools
    let pairs = vec![
        (env.get_account(10), env.get_account(11), 500),   // CSPR/USDC 0.05%
        (env.get_account(10), env.get_account(12), 3000),  // CSPR/DAI 0.3%
        (env.get_account(11), env.get_account(12), 3000),  // USDC/DAI 0.3%
    ];

    for (i, (token0, token1, fee)) in pairs.iter().enumerate() {
        println!("\nDeploying Pool {}...", i + 1);

        let pool_args = PoolInitArgs {
            factory: factory.address(),
            token0: *token0,
            token1: *token1,
            fee: *fee,
            tick_spacing: if *fee == 500 { 10 } else { 60 },
        };

        let mut pool = Pool::deploy(&env, pool_args);
        let sqrt_price = U256::from(1u128 << 96);
        pool.initialize(sqrt_price);

        factory.register_pool(pool.address(), *token0, *token1, *fee);

        let registered = factory.get_pool(*token0, *token1, *fee);
        assert_eq!(registered, Some(pool.address()));

        println!("  ✓ Pool {} deployed and registered: {:?}", i + 1, pool.address());
    }

    println!("\n✓ All {} pools deployed successfully!\n", pairs.len());
}

#[test]
fn test_factory_security() {
    let env = odra_test::env();

    println!("\n=== Testing Factory Security ===\n");

    // Deploy as owner
    let owner = env.get_account(0);
    env.set_caller(owner);

    let mut factory = Factory::deploy(&env, NoArgs);
    println!("Factory deployed by owner: {:?}", owner);

    // Deploy a pool
    let token0 = env.get_account(10);
    let token1 = env.get_account(11);
    let pool_args = PoolInitArgs {
        factory: factory.address(),
        token0,
        token1,
        fee: 3000,
        tick_spacing: 60,
    };
    let mut pool = PoolHostRef::deploy(&env, pool_args);
    pool.initialize(U256::from(1u128 << 96));

    // Owner can register
    println!("\nTesting owner can register pool...");
    factory.register_pool(pool.address(), token0, token1, 3000);
    println!("  ✓ Owner successfully registered pool");

    // Non-owner cannot register (would panic)
    println!("\nTesting non-owner cannot register pool...");
    env.set_caller(env.get_account(1)); // Switch to different account

    let result = std::panic::catch_unwind(|| {
        let pool2_args = PoolInitArgs {
            factory: factory.address(),
            token0: env.get_account(12),
            token1: env.get_account(13),
            fee: 3000,
            tick_spacing: 60,
        };
        let mut pool2 = Pool::deploy(&env, pool2_args);
        pool2.initialize(U256::from(1u128 << 96));

        factory.register_pool(pool2.address(), env.get_account(12), env.get_account(13), 3000);
    });

    assert!(result.is_err(), "Non-owner should not be able to register pool");
    println!("  ✓ Non-owner correctly rejected");

    println!("\n✓ Factory security working correctly!\n");
}
