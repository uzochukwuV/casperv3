# Smart Contract Deployment Guide

This guide covers deploying both the CasperSwap V3 DEX and the Premier League Virtual Betting Game.

## Prerequisites

- Rust toolchain installed
- Odra CLI v2.4.0
- Casper 2.0 compatible network access

## Quick Start

### 1. Build All Contracts

```bash
# Build DEX contracts
cd smart-contract/dex-contracts
cargo odra build

# Build Premier League betting game
cd ../plvx
cargo odra build
```

## CasperSwap V3 DEX Deployment

### Overview
CasperSwap V3 is a concentrated liquidity DEX with:
- **Factory**: Pool deployment and management
- **Pool**: Core AMM with concentrated liquidity (4000x capital efficiency)
- **PositionManager**: NFT-based position management
- **TestToken**: WCSPR and USDC test tokens

### Deploy DEX Contracts

```bash
cd smart-contract/dex-contracts

# Deploy all DEX contracts (Factory, PositionManager, WCSPR, USDC)
cargo odra deploy
```

**Output:**
```
🚀 Deploying CasperSwap V3 DEX Contracts...

1️⃣  Deploying Factory...
   ✅ Factory deployed at: hash-xxxxx

2️⃣  Deploying PositionManager...
   ✅ PositionManager deployed at: hash-xxxxx

3️⃣  Deploying Test Tokens...
   ✅ WCSPR deployed at: hash-xxxxx
   ✅ USDC deployed at: hash-xxxxx

✨ DEX Deployment complete!
```

### Deploy Individual Pool

```bash
# Use the CLI to create a new pool
cargo odra call --contract Factory --method create_pool \
  --args '{"token_a": "hash-wcspr", "token_b": "hash-usdc", "fee": 3000}'
```

### CLI Commands

```bash
# View deployed contracts
cargo odra list-contracts

# Call Pool functions
cargo odra call --contract Pool --method initialize \
  --args '{"sqrt_price_x96": "79228162514264337593543950336"}'  # Price = 1

# Mint liquidity
cargo odra call --contract Pool --method mint \
  --args '{"recipient": "account-hash-xxx", "tick_lower": -100, "tick_upper": 100, "amount": "1000000"}'

# Get pool info
cargo odra call --contract Pool --method get_sqrt_price_x96
cargo odra call --contract Pool --method get_liquidity
```

## Premier League Betting Game Deployment

### Overview
Virtual Premier League betting platform with:
- **$LEAGUE Token**: 100M supply, 30% airdrop
- **20 Teams**: Full Premier League roster
- **Matches**: 10 matches every 15 minutes
- **Seasons**: 36 turns (9 hours total)
- **NFT Badges**: Team badges with betting bonuses
- **Free Predictions**: Season winner pool (2% of bets)

### Deploy Premier League Contract

```bash
cd smart-contract/plvx

# Deploy the Premier League contract
cargo odra deploy
```

**Output:**
```
⚽ Deploying Premier League Virtual Betting Game...

1️⃣  Deploying PremierLeague contract...
   ✅ PremierLeague deployed at: hash-xxxxx

💰 Contract Features:
   • $LEAGUE Token: 100M supply (30% airdrop pool)
   • 20 Premier League Teams
   • 10 matches every 15 minutes
   • 36 turns per season (9 hours)
   • Free season winner predictions (2% prize pool)
   • NFT Team Badges with 5% betting bonus
   • House edge: 4% (configurable 3-5%)
   • Marketplace fee: 2.5%

✨ Deployment complete!
```

### CLI Commands

```bash
# Start a new season (owner only)
cargo odra call --contract PremierLeague --method start_season

# Place a bet
cargo odra call --contract PremierLeague --method place_bet \
  --args '{"match_id": 1, "predicted_result": "HomeWin", "amount": "100000000000000000000"}'

# Simulate a match (owner only)
cargo odra call --contract PremierLeague --method simulate_match \
  --args '{"match_id": 1}'

# Settle a bet
cargo odra call --contract PremierLeague --method settle_bet \
  --args '{"bet_id": "1"}'

# Predict season winner (free)
cargo odra call --contract PremierLeague --method predict_season_winner \
  --args '{"season_id": 1, "team_id": 12}'  # 12 = Manchester City

# Mint team badge NFT
cargo odra call --contract PremierLeague --method mint_badge \
  --args '{"team_id": 10}'  # 10 = Liverpool

# List badge for sale
cargo odra call --contract PremierLeague --method list_badge \
  --args '{"token_id": "1", "price": "1000000000000000000000"}'  # 1000 LEAGUE

# Buy badge
cargo odra call --contract PremierLeague --method buy_badge \
  --args '{"token_id": "1"}'

# Get match info
cargo odra call --contract PremierLeague --method get_match \
  --args '{"match_id": 1}'

# Get team stats
cargo odra call --contract PremierLeague --method get_team_stats \
  --args '{"season_id": 1, "team_id": 12}'

# Get user bets
cargo odra call --contract PremierLeague --method get_user_bets \
  --args '{"user": "account-hash-xxx"}'
```

## Premier League Teams Reference

| Team ID | Team Name |
|---------|-----------|
| 1 | Arsenal |
| 2 | Aston Villa |
| 3 | Bournemouth |
| 4 | Brentford |
| 5 | Brighton |
| 6 | Chelsea |
| 7 | Crystal Palace |
| 8 | Everton |
| 9 | Fulham |
| 10 | Liverpool |
| 11 | Luton Town |
| 12 | Manchester City |
| 13 | Manchester United |
| 14 | Newcastle United |
| 15 | Nottingham Forest |
| 16 | Sheffield United |
| 17 | Tottenham |
| 18 | West Ham |
| 19 | Wolverhampton |
| 20 | Burnley |

## Configuration

### Network Configuration

Edit `Odra.toml` for network settings:

```toml
[network.testnet]
node_address = "http://65.21.235.219:7777"
chain_name = "casper-test"

[network.mainnet]
node_address = "http://65.108.78.120:7777"
chain_name = "casper"
```

### Gas Limits

Recommended gas limits:
- **Factory deployment**: 450,000,000,000
- **Pool deployment**: 450,000,000,000
- **PositionManager deployment**: 450,000,000,000
- **Token deployment**: 300,000,000,000
- **PremierLeague deployment**: 500,000,000,000
- **Regular transactions**: 50,000,000 - 100,000,000

## Verification

### Verify DEX Deployment

```bash
cd smart-contract/dex-contracts

# Check Factory
cargo odra call --contract Factory --method get_pool \
  --args '{"token0": "hash-wcspr", "token1": "hash-usdc", "fee": 3000}'

# Check token balances
cargo odra call --contract TestToken --method balance_of \
  --args '{"account": "your-account-hash"}'
```

### Verify Premier League Deployment

```bash
cd smart-contract/plvx

# Check house balance
cargo odra call --contract PremierLeague --method get_house_balance

# Check current season
cargo odra call --contract PremierLeague --method get_season \
  --args '{"season_id": 1}'
```

## Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clean and rebuild
cargo clean
cargo odra build
```

**Deployment Fails:**
- Check gas limits
- Verify network connectivity
- Ensure account has sufficient balance

**Transaction Reverts:**
- Check function parameters
- Verify caller permissions (owner-only functions)
- Check contract state (e.g., season must be active)

## Next Steps

### For DEX:
1. Initialize pools with starting price
2. Add initial liquidity
3. Set up frontend integration
4. Test swap functionality

### For Premier League:
1. Start first season
2. Configure keeper for match simulation
3. Set up frontend for betting
4. Test full season cycle

## Support

- **Documentation**: See `PREMIER_LEAGUE_BETTING.md` for detailed game mechanics
- **Odra Docs**: https://odra.dev/docs
- **Casper Docs**: https://docs.casper.network
