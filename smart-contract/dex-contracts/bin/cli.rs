//! CasperSwap V3 DEX - Command Line Interface

use dex_contracts::{
    factory::Factory,
    pool::Pool,
    position_manager::{PositionManager, PositionManagerInitArgs},
    test_token::{TestToken, TestTokenInitArgs},
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv, NoArgs},
    prelude::Addressable,
};
use odra_cli::OdraCli;

/// Deploy script for the DEX contracts
pub struct DeployDexScript;

impl odra_cli::deploy::DeployScript for DeployDexScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut odra_cli::DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        println!("\n🚀 Deploying CasperSwap V3 DEX Contracts...\n");

        // Deploy Factory
        println!("1️⃣  Deploying Factory...");
        env.set_gas(450_000_000_000);
        let factory = Factory::try_deploy(env, NoArgs)?;
        container.add_contract(&factory)?;
        println!("   ✅ Factory deployed at: {:?}\n", factory.address());

        // Deploy PositionManager
        println!("2️⃣  Deploying PositionManager...");
        env.set_gas(450_000_000_000);
        let pos_manager = PositionManager::try_deploy(
            env,
            PositionManagerInitArgs {
                factory: factory.address(),
            },
        )?;
        container.add_contract(&pos_manager)?;
        println!("   ✅ PositionManager deployed at: {:?}\n", pos_manager.address());

        // Deploy Test Tokens
        println!("3️⃣  Deploying Test Tokens...");
        env.set_gas(300_000_000_000);

        let initial_supply = U256::from(1_000_000) * U256::from(10u128.pow(18));
        let token0 = TestToken::try_deploy(
            env,
            TestTokenInitArgs {
                name: "Wrapped CSPR".to_string(),
                symbol: "WCSPR".to_string(),
                decimals: 18,
                initial_supply,
            },
        )?;
        container.add_contract(&token0)?;
        println!("   ✅ WCSPR deployed at: {:?}", token0.address());

        let usdc_supply = U256::from(10_000_000) * U256::from(10u128.pow(6));
        let token1 = TestToken::try_deploy(
            env,
            TestTokenInitArgs {
                name: "USD Coin".to_string(),
                symbol: "USDC".to_string(),
                decimals: 6,
                initial_supply: usdc_supply,
            },
        )?;
        container.add_contract(&token1)?;
        println!("   ✅ USDC deployed at: {:?}\n", token1.address());

        println!("✨ DEX Deployment complete!\n");
        Ok(())
    }
}

/// Main CLI entry point
pub fn main() {
    OdraCli::new()
        .about("CasperSwap V3 DEX - Command Line Interface")
        .deploy(DeployDexScript)
        .contract::<Factory>()
        .contract::<Pool>()
        .contract::<PositionManager>()
        .contract::<TestToken>()
        .build()
        .run();
}
