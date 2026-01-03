//! CasperSwap V3 DEX - Command Line Interface

use dex_contracts::{
    unified_dex::UnifiedDex,
    unified_position_manager::{UnifiedPositionManager, UnifiedPositionManagerInitArgs},
    router::{Router, RouterInitArgs, ExactInputParams},
    test_token::{TestToken, TestTokenInitArgs},
};
use odra::{
    casper_types::{U256, U128},
    host::{Deployer, HostEnv, NoArgs},
    prelude::Addressable,
};
use odra_cli::OdraCli;

/// Deploy script for the unified DEX contracts with comprehensive testing
pub struct DeployUnifiedDexScript;

impl odra_cli::deploy::DeployScript for DeployUnifiedDexScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut odra_cli::DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        println!("\n🚀 CasperSwap V3 - Deployment & Test Suite\n");
        println!("{}", "=".repeat(80));

        // ===== DEPLOYMENT PHASE =====
        println!("\n📦 PHASE 1: CONTRACT DEPLOYMENT\n");

        // Deploy Unified DEX
        println!("1️⃣  Deploying UnifiedDex...");
        env.set_gas(450_000_000_000);
        let mut dex = UnifiedDex::try_deploy(env, NoArgs)?;
        container.add_contract(&dex)?;
        println!("   ✅ UnifiedDex: {:?}", dex.address());

        // Deploy Router
        println!("\n2️⃣  Deploying Router...");
        env.set_gas(300_000_000_000);
        let mut router = Router::try_deploy(env, RouterInitArgs {
            dex_address: dex.address(),
        })?;
        container.add_contract(&router)?;
        println!("   ✅ Router: {:?}", router.address());

        // Deploy Position Manager
        println!("\n3️⃣  Deploying UnifiedPositionManager...");
        env.set_gas(450_000_000_000);
        let mut pos_manager = UnifiedPositionManager::try_deploy(
            env,
            UnifiedPositionManagerInitArgs {
                dex_address: dex.address(),
            },
        )?;
        container.add_contract(&pos_manager)?;
        println!("   ✅ UnifiedPositionManager: {:?}", pos_manager.address());

        // Deploy Test Tokens
        println!("\n4️⃣  Deploying Test Tokens...");
        env.set_gas(300_000_000_000);

        let initial_supply = U256::from(1_000_000) * U256::from(10u128.pow(18));

        let mut wcspr = TestToken::try_deploy(
            
            env,
            TestTokenInitArgs {
                name: "Tapped CSPR".to_string(),
                symbol: "WCSPR".to_string(),
                decimals: 18,
                initial_supply,
            },
        )?;
        container.add_contract(&wcspr)?;
        println!("   ✅ TCSPR: {:?}", wcspr.address());

        let mut usdc = TestToken::try_deploy(
            env,
            TestTokenInitArgs {
                name: "USDT Coin".to_string(),
                symbol: "USDT".to_string(),
                decimals: 6,
                initial_supply: U256::from(10_000_000) * U256::from(10u128.pow(6)),
            },
        )?;
        container.add_contract(&usdc)?;
        println!("   ✅ USDT: {:?}", usdc.address());

        let mut dai = TestToken::try_deploy(
            env,
            TestTokenInitArgs {
                name: "CDai Stablecoin".to_string(),
                symbol: "CDAI".to_string(),
                decimals: 18,
                initial_supply,
            },
        )?;
        container.add_contract(&dai)?;
        println!("   ✅ CDAI: {:?}", dai.address());

        // ===== POOL CREATION PHASE =====
        println!("\n{}", "=".repeat(80));
        println!("\n📊 PHASE 2: POOL CREATION\n");

        // Create pools
        println!("5️⃣  Creating pools...");

        let pool1_id = dex.create_pool(wcspr.address(), usdc.address(), 3000);
        println!("   ✅ WCSPR/USDC pool created (ID: {:?})", pool1_id);

        let pool2_id = dex.create_pool(usdc.address(), dai.address(), 500);
        println!("   ✅ USDC/DAI pool created (ID: {:?})", pool2_id);

        // Initialize pools with prices
        println!("\n6️⃣  Initializing pool prices...");

        // Price: 1 WCSPR = 1000 USDC (sqrt(1000) * 2^96 ≈ 2.5e30)
        let sqrt_price_wcspr_usdc = U256::from_dec_str("2505414482898171603534460317184").unwrap();
        dex.initialize_pool(wcspr.address(), usdc.address(), 3000, sqrt_price_wcspr_usdc);
        println!("   ✅ WCSPR/USDC initialized at ~1000 USDC per WCSPR");

        // Price: 1 USDC = 1 DAI (sqrt(1) * 2^96 = 2^96)
        let sqrt_price_usdc_dai = U256::from(1u128 << 96);
        dex.initialize_pool(usdc.address(), dai.address(), 500, sqrt_price_usdc_dai);
        println!("   ✅ USDC/DAI initialized at 1:1");

        // ===== LIQUIDITY PHASE =====
        println!("\n{}", "=".repeat(80));
        println!("\n💧 PHASE 3: LIQUIDITY PROVISION\n");

        let user = env.caller();
        let dex_addr = dex.address();

        println!("7️⃣  Adding liquidity to WCSPR/USDC pool...");

        // Approve DEX to spend tokens
        let approve_amount_wcspr = U256::from(1000) * U256::from(10u128.pow(18));
        let approve_amount_usdc = U256::from(1_000_000) * U256::from(10u128.pow(6));

        wcspr.approve(dex_addr, approve_amount_wcspr);
        usdc.approve(dex_addr, approve_amount_usdc);

        // Add liquidity
        let (amount0, amount1) = dex.mint(
            wcspr.address(),
            usdc.address(),
            3000,
            user,
            -600,  // tick_lower
            600,   // tick_upper
            U128::from(10000000u128),
            U256::zero(), // amount0_min (no slippage protection for initial liquidity)
            U256::zero(), // amount1_min
        );
        println!("   ✅ Added liquidity: {} WCSPR, {} USDC", amount0, amount1);

        println!("\n8️⃣  Adding liquidity to USDC/DAI pool...");

        let approve_amount_dai = U256::from(1_000_000) * U256::from(10u128.pow(18));
        usdc.approve(dex_addr, approve_amount_usdc);
        dai.approve(dex_addr, approve_amount_dai);

        let (amount0_2, amount1_2) = dex.mint(
            usdc.address(),
            dai.address(),
            500,
            user,
            -100,
            100,
            U128::from(10000000u128),
            U256::zero(), // amount0_min
            U256::zero(), // amount1_min
        );
        println!("   ✅ Added liquidity: {} USDC, {} DAI", amount0_2, amount1_2);

        // ===== SWAP TESTING PHASE =====
        println!("\n{}", "=".repeat(80));
        println!("\n💱 PHASE 4: SWAP TESTING\n");

        println!("9️⃣  Testing single-hop swap (WCSPR → USDC)...");

        let swap_amount = U256::from(10) * U256::from(10u128.pow(18)); // 10 WCSPR
        wcspr.approve(dex_addr, swap_amount);

        let (amt0, amt1) = dex.swap(
            wcspr.address(),
            usdc.address(),
            3000,
            user,
            true, // zero_for_one
            swap_amount.as_u128() as i64,
            U256::zero(),
        );
        println!("   ✅ Swapped {} WCSPR → {} USDC", amt0, -amt1);

        println!("\n🔟 Testing multi-hop swap (WCSPR → USDC → DAI)...");

        let multihop_amount = U256::from(5) * U256::from(10u128.pow(18)); // 5 WCSPR
        wcspr.approve(dex_addr, multihop_amount);

        // Note: Router needs approval too
        let router_addr = router.address();
        wcspr.approve(router_addr, multihop_amount);

        let path = vec![wcspr.address(), usdc.address(), dai.address()];
        let fees = vec![3000, 500];

        let final_amount = router.swap_exact_input_multi_hop(ExactInputParams {
            path,
            fees,
            recipient: user,
            deadline: env.block_time() + 3600,
            amount_in: multihop_amount,
            amount_out_minimum: U256::zero(),
        });
        println!("   ✅ Multi-hop: 5 WCSPR → {} DAI", final_amount);

        // ===== LIQUIDITY REMOVAL PHASE =====
        println!("\n{}", "=".repeat(80));
        println!("\n🔙 PHASE 5: LIQUIDITY REMOVAL\n");

        println!("1️⃣1️⃣  Removing half of liquidity from WCSPR/USDC...");

        let (burn0, burn1) = dex.burn(
            wcspr.address(),
            usdc.address(),
            3000,
            -600,
            600,
            U128::from(5000000u128),
        );
        println!("   ✅ Burned liquidity: {} WCSPR, {} USDC owed", burn0, burn1);

        println!("\n1️⃣2️⃣  Collecting tokens owed...");

        let (collected0, collected1) = dex.collect(
            wcspr.address(),
            usdc.address(),
            3000,
            user,
            -600,
            600,
            U128::MAX,
            U128::MAX,
        );
        println!("   ✅ Collected: {} WCSPR, {} USDC", collected0, collected1);

        // ===== SUMMARY =====
        println!("\n{}", "=".repeat(80));
        println!("\n✨ DEPLOYMENT & TEST COMPLETE!\n");
        println!("📋 Summary:");
        println!("   • Contracts deployed: 6 (DEX, Router, PositionManager, 3 Tokens)");
        println!("   • Pools created: 2 (WCSPR/USDC, USDC/DAI)");
        println!("   • Liquidity added: ✅");
        println!("   • Single-hop swap: ✅");
        println!("   • Multi-hop swap: ✅");
        println!("   • Liquidity removal: ✅");
        println!("\n{}\n", "=".repeat(80));

        Ok(())
    }
}

/// Main CLI entry point
pub fn main() {
    OdraCli::new()
        .about("CasperSwap V3 Unified DEX - Command Line Interface")
        .deploy(DeployUnifiedDexScript)
        .contract::<UnifiedDex>()
        .contract::<Router>()
        .contract::<UnifiedPositionManager>()
        .contract::<TestToken>()
        .build()
        .run();
}
