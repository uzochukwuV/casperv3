use odra::{
    casper_types::U256,
    prelude::*,
};
use odra_modules::erc20::Erc20;

/// Test ERC20 token for DEX testing
///
/// This is a simple wrapper around odra-modules Erc20 for testing purposes.
/// In production, users would deploy their own CEP-18 tokens.
#[odra::module]
pub struct TestToken {
    erc20: SubModule<Erc20>,
}

#[odra::module]
impl TestToken {
    /// Initialize the test token with name, symbol, decimals, and initial supply
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256) {
        let caller = self.env().caller();

        // Initialize the underlying ERC20 with optional initial supply
        self.erc20.init(name, symbol, decimals, Some(initial_supply));

        // Mint initial supply to deployer
        if !initial_supply.is_zero() {
            self.erc20.mint(&caller, &initial_supply);
        }
    }

    /// Mint new tokens (for testing only)
    pub fn mint(&mut self, recipient: Address, amount: U256) {
        self.erc20.mint(&recipient, &amount);
    }

    /// Burn tokens (for testing only)
    pub fn burn(&mut self, owner: Address, amount: U256) {
        self.erc20.burn(&owner, &amount);
    }

    // Proxy methods to underlying ERC20

    pub fn transfer(&mut self, recipient: Address, amount: U256) {
        self.erc20.transfer(&recipient, &amount);
    }

    pub fn transfer_from(&mut self, owner: Address, recipient: Address, amount: U256) {
        self.erc20.transfer_from(&owner, &recipient, &amount);
    }

    pub fn approve(&mut self, spender: Address, amount: U256) {
        self.erc20.approve(&spender, &amount);
    }

    pub fn balance_of(&self, account: Address) -> U256 {
        self.erc20.balance_of(&account)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.erc20.allowance(&owner, &spender)
    }

    pub fn total_supply(&self) -> U256 {
        self.erc20.total_supply()
    }

    pub fn name(&self) -> String {
        self.erc20.name()
    }

    pub fn symbol(&self) -> String {
        self.erc20.symbol()
    }

    pub fn decimals(&self) -> u8 {
        self.erc20.decimals()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::Deployer;

    #[test]
    fn test_token_creation() {
        let env = odra_test::env();
        let deployer = env.get_account(0);

        env.set_caller(deployer);

        let initial_supply = U256::from(1_000_000) * U256::from(10u128.pow(18)); // 1M tokens with 18 decimals

        let init_args = TestTokenInitArgs {
            name: "Test Token".to_string(),
            symbol: "TEST".to_string(),
            decimals: 18,
            initial_supply,
        };

        let token = TestToken::deploy(&env, init_args);

        assert_eq!(token.name(), "Test Token");
        assert_eq!(token.symbol(), "TEST");
        assert_eq!(token.decimals(), 18);
        assert_eq!(token.balance_of(deployer), initial_supply);
        assert_eq!(token.total_supply(), initial_supply);
    }

    #[test]
    fn test_token_transfer() {
        let env = odra_test::env();
        let deployer = env.get_account(0);
        let recipient = env.get_account(1);

        env.set_caller(deployer);

        let initial_supply = U256::from(1000);
        let init_args = TestTokenInitArgs {
            name: "Test Token".to_string(),
            symbol: "TEST".to_string(),
            decimals: 18,
            initial_supply,
        };

        let mut token = TestToken::deploy(&env, init_args);

        let transfer_amount = U256::from(100);
        token.transfer(recipient, transfer_amount);

        assert_eq!(token.balance_of(deployer), U256::from(900));
        assert_eq!(token.balance_of(recipient), U256::from(100));
    }

    #[test]
    fn test_token_approve_and_transfer_from() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let spender = env.get_account(1);
        let recipient = env.get_account(2);

        env.set_caller(owner);

        let initial_supply = U256::from(1000);
        let init_args = TestTokenInitArgs {
            name: "Test Token".to_string(),
            symbol: "TEST".to_string(),
            decimals: 18,
            initial_supply,
        };

        let mut token = TestToken::deploy(&env, init_args);

        // Owner approves spender
        let approval_amount = U256::from(500);
        token.approve(spender, approval_amount);
        assert_eq!(token.allowance(owner, spender), approval_amount);

        // Spender transfers from owner to recipient
        env.set_caller(spender);
        let transfer_amount = U256::from(200);
        token.transfer_from(owner, recipient, transfer_amount);

        assert_eq!(token.balance_of(owner), U256::from(800));
        assert_eq!(token.balance_of(recipient), U256::from(200));
        assert_eq!(token.allowance(owner, spender), U256::from(300));
    }
}
