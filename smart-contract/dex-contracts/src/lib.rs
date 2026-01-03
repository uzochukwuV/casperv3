#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

// Core contracts
pub mod unified_dex;           // Main DEX contract (replaces factory + pools)
pub mod unified_position_manager; // Position manager for unified DEX
pub mod router;                // Multi-hop swap router

// Test token (for testing/demo purposes)
pub mod test_token;

// Math libraries
pub mod math;

// Types and utilities
pub mod types;
pub mod storage;

// Constants
pub mod constants;
