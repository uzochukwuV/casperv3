//! Premier League Virtual Betting Game - Command Line Interface

use plvx::premier_league::PremierLeague;
use odra::{
    host::{Deployer, HostEnv, NoArgs},
    prelude::Addressable,
};
use odra_cli::OdraCli;

/// Deploy script for the Premier League betting game
pub struct DeployPremierLeagueScript;

impl odra_cli::deploy::DeployScript for DeployPremierLeagueScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut odra_cli::DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        println!("\n⚽ Deploying Premier League Virtual Betting Game...\n");

        // Deploy PremierLeague contract
        println!("1️⃣  Deploying PremierLeague contract...");
        env.set_gas(500_000_000_000);
        let premier_league = PremierLeague::try_deploy(env, NoArgs)?;
        container.add_contract(&premier_league)?;
        println!("   ✅ PremierLeague deployed at: {:?}\n", premier_league.address());

        println!("💰 Contract Features:");
        println!("   • $LEAGUE Token: 100M supply (30% airdrop pool)");
        println!("   • 20 Premier League Teams");
        println!("   • 10 matches every 15 minutes");
        println!("   • 36 turns per season (9 hours)");
        println!("   • Free season winner predictions (2% prize pool)");
        println!("   • NFT Team Badges with 5% betting bonus");
        println!("   • House edge: 4% (configurable 3-5%)");
        println!("   • Marketplace fee: 2.5%\n");

        println!("✨ Deployment complete!\n");
        Ok(())
    }
}

/// Main CLI entry point
pub fn main() {
    OdraCli::new()
        .about("Premier League Virtual Betting Game - Command Line Interface")
        .deploy(DeployPremierLeagueScript)
        .contract::<PremierLeague>()
        .build()
        .run();
}
