# Premier League Virtual Betting Game

A decentralized virtual Premier League betting platform on Casper Network with randomness, seasons, and NFT team badges.

## 🎮 Game Features

### Core Mechanics
- **10 Matches Every 15 Minutes**: Fast-paced virtual football matches
- **36 Turns Per Season**: Complete season runs for 9 hours (36 × 15 min)
- **20 Premier League Teams**: All teams from English Premier League
- **Randomized Results**: Fair random score generation (0-5 goals per team)

### Betting System
- **Match Winner Bets**: Bet on Home Win, Draw, or Away Win
- **3-5% House Edge**: Industry standard (configurable)
- **Dynamic Odds**: Based on betting pool distribution
- **Instant Settlements**: Automated payout after match completion

### Season Winner Pool (FREE)
- **Free to Predict**: No cost to predict season champion
- **2% Prize Pool**: 2% of total season bets distributed to winners
- **Fair Distribution**: Prize split among all correct predictions

### $LEAGUE Platform Token
- **Total Supply**: 100,000,000 LEAGUE
- **30% Airdrop**: Reserved for early users
- **Betting Currency**: All bets placed in LEAGUE tokens
- **Governance**: Future DAO voting power

### NFT Team Badges
- **20 Collectible Badges**: One for each Premier League team
- **Betting Bonuses**: 5% bonus on bets when holding team badge
- **Marketplace**: Buy/Sell badges with 2.5% fee
- **Rarity**: Limited supply per team

## 📊 How It Works

### Season Flow

```
1. Season Starts (Turn 1/36)
   ↓
2. 10 Matches Scheduled (every 15 min)
   ↓
3. Users Place Bets (before match starts)
   ↓
4. Match Simulated (random scores 0-5)
   ↓
5. Bets Settled Automatically
   ↓
6. Team Stats Updated (wins/draws/losses/points)
   ↓
7. Next Turn Scheduled
   ↓
8. Repeat until Turn 36
   ↓
9. Season Ends → Winner Declared
   ↓
10. Prize Pool Distributed
```

### Match Result Generation

**Randomness Algorithm**:
```rust
random_seed = block_time + match_id
home_score = (random_seed * 13) % 6  // 0-5 goals
away_score = (random_seed * 17) % 6  // 0-5 goals
```

**Result Determination**:
- `home_score > away_score` → **Home Win**
- `home_score < away_score` → **Away Win**
- `home_score == away_score` → **Draw**

### Points System

| Result | Points Awarded |
|--------|---------------|
| Win    | 3 points      |
| Draw   | 1 point       |
| Loss   | 0 points      |

**Season Winner**: Team with highest points after 36 turns

## 💰 Betting Economics

### House Edge (3-5%)

```
User Bet: 100 LEAGUE
House Edge (4%): 4 LEAGUE
Effective Bet: 96 LEAGUE
```

**Revenue Distribution**:
- House Balance: Operational costs & liquidity
- Season Winner Pool: 2% of season total
- Marketplace Fees: Platform sustainability

### Odds Calculation

**Simplified Model** (current):
- Fixed odds of 2.0x for all outcomes

**Dynamic Model** (production):
```
Odds = Total Pool / Outcome Pool
```

**Example**:
```
Match: Team A vs Team B

Total Bets: 1000 LEAGUE
- Home Win: 400 LEAGUE → Odds = 1000/400 = 2.5x
- Draw: 300 LEAGUE → Odds = 1000/300 = 3.33x
- Away Win: 300 LEAGUE → Odds = 1000/300 = 3.33x
```

### Payout Calculation

```
Bet Amount: 100 LEAGUE (after house edge: 96 LEAGUE)
Odds: 2.5x (stored as 2500)
Payout: 96 * (2500 / 1000) = 240 LEAGUE
Profit: 240 - 100 = 140 LEAGUE
```

## 🎭 NFT Team Badges

### Badge Benefits

1. **Betting Bonus**: 5% extra on winning bets
   ```
   Without Badge: 100 LEAGUE → Win 200 LEAGUE
   With Badge: 100 LEAGUE → Win 210 LEAGUE
   ```

2. **Collection Rewards**: Bonuses for collecting multiple teams
3. **Governance Rights**: Vote on platform changes
4. **Exclusive Access**: Early access to new features

### Marketplace

**Listing**:
```rust
list_badge(token_id, price)
// Sets sale price for your badge
```

**Buying**:
```rust
buy_badge(token_id)
// Price: 1000 LEAGUE
// Marketplace Fee: 25 LEAGUE (2.5%)
// Seller Receives: 975 LEAGUE
```

## 🚀 Smart Contract Functions

### Admin Functions

```rust
// Start new season
start_season()

// Simulate match (called by keeper every 15 min)
simulate_match(match_id: u32)

// End season and declare winner
end_season(season_id: u32)
```

### User Functions

**Betting**:
```rust
// Place bet on match
place_bet(
    match_id: u32,
    predicted_result: MatchResult, // HomeWin, Draw, AwayWin
    amount: U256
)

// Settle your bet after match ends
settle_bet(bet_id: U256)
```

**Season Predictions (FREE)**:
```rust
// Predict season winner (no cost)
predict_season_winner(season_id: u32, team_id: u8)

// Claim prize if prediction correct
claim_season_prize(season_id: u32)
```

**NFT Badges**:
```rust
// Mint team badge
mint_badge(team_id: u8)

// List for sale
list_badge(token_id: U256, price: U256)

// Buy listed badge
buy_badge(token_id: U256)
```

### View Functions

```rust
get_season(season_id: u32) -> Season
get_match(match_id: u32) -> Match
get_team_stats(season_id: u32, team_id: u8) -> TeamStats
get_bet(bet_id: U256) -> Bet
get_user_bets(user: Address) -> Vec<U256>
get_badge(token_id: U256) -> TeamBadge
get_house_balance() -> U256
```

## 📈 Tokenomics: $LEAGUE

### Distribution

| Category | Amount | Percentage |
|----------|--------|-----------|
| **Total Supply** | 100,000,000 | 100% |
| Airdrop Pool | 30,000,000 | 30% |
| Liquidity | 20,000,000 | 20% |
| Team & Development | 15,000,000 | 15% |
| Marketing | 10,000,000 | 10% |
| Community Rewards | 15,000,000 | 15% |
| Reserve | 10,000,000 | 10% |

### Airdrop Criteria (30M LEAGUE)

**Early Users**:
- First 10,000 users: 1,000 LEAGUE each
- Users who place 10+ bets: 500 LEAGUE
- Badge holders: 300 LEAGUE per badge
- Season winner predictors: 200 LEAGUE

### Utility

1. **Betting Currency**: Place bets in LEAGUE
2. **NFT Purchases**: Buy/Sell team badges
3. **Staking**: Stake for higher betting limits
4. **Governance**: Vote on:
   - House edge percentage
   - New team additions
   - Feature implementations
   - Prize pool distributions

## 🏆 Premier League Teams (20)

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

## 🛠️ Deployment

### Build Contract

```bash
cd smart-contract/plvx
cargo odra build
```

### Deploy

```bash
cargo odra deploy
```

### Initialize

```rust
// Deploy sets up:
// - $LEAGUE token (100M supply)
// - 30% to airdrop pool
// - House edge at 4%
// - Ready to start first season
```

## 📱 Frontend Integration

### Key User Flows

**1. Place Bet**:
```typescript
// 1. Approve LEAGUE tokens
await leagueToken.approve(contractAddress, betAmount)

// 2. Place bet
await premierLeague.placeBet(matchId, HomeWin, betAmount)
```

**2. Settle Bet**:
```typescript
// After match finishes
await premierLeague.settleBet(betId)
```

**3. Predict Season Winner**:
```typescript
// Free prediction
await premierLeague.predictSeasonWinner(seasonId, teamId)
```

**4. Buy Badge**:
```typescript
// 1. Approve tokens
await leagueToken.approve(contractAddress, price)

// 2. Buy badge
await premierLeague.buyBadge(tokenId)
```

## 🔐 Security Features

### Randomness
- Block time-based pseudo-randomness
- Multiple prime number multipliers (13, 17)
- Unpredictable by users before match

### Access Control
- Owner-only match simulation
- User-only bet settlement
- Badge ownership verification

### Economic Security
- House edge ensures platform sustainability
- Marketplace fees prevent manipulation
- Prize pools locked until distribution

## 🎯 Roadmap

### Phase 1: MVP (Current)
- ✅ Basic betting system
- ✅ Season management
- ✅ NFT badges
- ✅ $LEAGUE token

### Phase 2: Enhanced Features
- [ ] Chainlink VRF for true randomness
- [ ] Live match animations
- [ ] Leaderboards
- [ ] Referral system

### Phase 3: Advanced
- [ ] Multi-bet parlays
- [ ] In-play betting
- [ ] Team customization
- [ ] DAO governance

### Phase 4: Expansion
- [ ] Other leagues (La Liga, Serie A)
- [ ] Tournament modes
- [ ] Social features
- [ ] Mobile app

## 📊 Example Season

**Season 1 Statistics**:
- Duration: 9 hours (36 turns × 15 min)
- Total Matches: 360 (36 turns × 10 matches)
- Total Bets: 1,000,000 LEAGUE
- House Revenue: 40,000 LEAGUE (4%)
- Season Winner Pool: 20,000 LEAGUE (2%)
- Winning Team: Manchester City (84 points)
- Correct Predictions: 5,230 users
- Prize Per User: ~3.82 LEAGUE

## 🤝 Community

**Discord**: Join for live match updates
**Twitter**: @PremierLeagueBetting
**Telegram**: Real-time betting tips

## 📄 License

MIT License - Build awesome things!

---

**Built on Casper Network with Odra Framework**

*Powered by $LEAGUE | Collect. Bet. Win.*
