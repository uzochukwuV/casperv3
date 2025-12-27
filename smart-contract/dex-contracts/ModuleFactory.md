## Factory pattern
## Exmaple 1
use odra::prelude::*;

#[odra::module(factory=on)]
pub struct Counter {
    /// The initial value for the counter.
    value: Var<u32>
}

#[odra::module(factory=on)]
impl Counter {
    pub fn init(&mut self, value: u32) {
        self.value.set(value);
    }

    pub fn increment(&mut self) {
        self.value.set(self.value.get_or_default() + 1);
    }

    pub fn value(&self) -> u32 {
        self.value.get_or_default()
    }
}

#[odra::module(factory=on)]
pub struct BetterCounter {
    /// The initial value for the counter.
    value: Var<u32>
}

#[odra::module(factory=on)]
impl BetterCounter {
    pub fn init(&mut self, value: u32) {
        self.value.set(value);
    }

    pub fn increment(&mut self) {
        self.value.set(self.value.get_or_default() + 1);
    }

    pub fn value(&self) -> u32 {
        self.value.get_or_default()
    }

    pub fn upgrade(&mut self, new_value: u32) {
        self.value.set(new_value);
    }
}

#[cfg(test)]
mod tests {
    use odra::{
        host::{Deployer, HostRef, InstallConfig, NoArgs},
        prelude::*,
        VmError
    };

    use crate::factory::counter::{BetterCounterFactory, BetterCounterUpgradeArgs};

    use super::{
        Counter, CounterFactory, CounterFactoryContractDeployed, CounterHostRef, CounterInitArgs
    };

    #[test]
    fn test_standalone_module() {
        let env = odra_test::env();
        let mut counter_ref = Counter::deploy(&env, CounterInitArgs { value: 1 });
        assert_eq!(counter_ref.value(), 1);
        counter_ref.increment();
        assert_eq!(counter_ref.value(), 2);
    }

    #[test]
    #[ignore = "This test does not work on odra vm"]
    fn test_factory() {
        let env = odra_test::env();
        // Deploy the factory contract
        let mut factory_ref = CounterFactory::deploy(&env, NoArgs);
        // Use the factory to deploy a new Counter contract with initial value 10
        let (address, _access_uref) = factory_ref.new_contract(String::from("Counter"), 10);
        assert!(env.emitted_event(
            &factory_ref,
            CounterFactoryContractDeployed {
                contract_address: address,
                contract_name: String::from("Counter")
            }
        ));
        // Interact with the newly deployed Counter contract
        let mut counter_ref = CounterHostRef::new(address, env);
        // Increment the counter
        counter_ref.increment();
        // The value should now be 11
        assert_eq!(counter_ref.value(), 11);
    }

    #[test]
    #[ignore = "This test does not work on odra vm"]
    fn test_factory_upgrade_works() {
        let env = odra_test::env();
        // Deploy the factory contract
        let mut factory = CounterFactory::deploy_with_cfg(
            &env,
            NoArgs,
            InstallConfig::upgradable::<CounterFactory>()
        );
        let (ten_address, _) = factory.new_contract(String::from("FromTen"), 10);
        let (two_address, _) = factory.new_contract(String::from("FromTwo"), 2);
        let (three_address, _) = factory.new_contract(String::from("FromThree"), 3);
        let (hundred_address, _) = factory.new_contract(String::from("FromHundred"), 100);

        // Upgrade the factory contract
        let result = BetterCounterFactory::try_upgrade(&env, factory.address(), NoArgs);
        assert!(result.is_ok());

        let mut factory = result.unwrap();
        factory.upgrade_child_contract(String::from("FromTen"), 122);
        factory.upgrade_child_contract(String::from("FromTwo"), 11);

        let args = vec![
            ("FromTwo".to_string(), 42u32),
            ("FromThree".to_string(), 42u32),
            ("FromHundred".to_string(), 1000u32),
        ]
        .into_iter()
        .map(|(contract_name, new_value)| (contract_name, BetterCounterUpgradeArgs { new_value }))
        .collect::<BTreeMap<_, _>>();

        factory.batch_upgrade_child_contract(args);

        assert_eq!(CounterHostRef::new(ten_address, env.clone()).value(), 122);
        assert_eq!(CounterHostRef::new(two_address, env.clone()).value(), 42);
        assert_eq!(CounterHostRef::new(three_address, env.clone()).value(), 42);
        assert_eq!(
            CounterHostRef::new(hundred_address, env.clone()).value(),
            1000
        );
    }

    #[test]
    #[ignore = "This test does not work on odra vm"]
    fn test_factory_upgrade_fails_for_unauthorized_caller() {
        let env = odra_test::env();
        // Deploy the factory contract
        let mut factory = CounterFactory::deploy_with_cfg(
            &env,
            NoArgs,
            InstallConfig::upgradable::<CounterFactory>()
        );
        let (address, _) = factory.new_contract(String::from("FromTen"), 10);

        // Upgrade the factory contract
        let result = BetterCounterFactory::try_upgrade(&env, factory.address(), NoArgs);
        assert!(result.is_ok());

        let mut factory = result.unwrap();
        // Change caller to unauthorized account
        let unauthorized_account = env.get_account(11);
        env.set_caller(unauthorized_account);
        let upgrade_result = factory.try_upgrade_child_contract(String::from("FromTen"), 122);
        assert_eq!(
            upgrade_result,
            Err(OdraError::VmError(VmError::InvalidContext))
        );

        // Ensure the value has not changed
        assert_eq!(CounterHostRef::new(address, env.clone()).value(), 10);

        let args = vec![
            ("FromTwo".to_string(), 42u32),
            ("FromThree".to_string(), 42u32),
            ("FromHundred".to_string(), 1000u32),
        ]
        .into_iter()
        .map(|(contract_name, new_value)| (contract_name, BetterCounterUpgradeArgs { new_value }))
        .collect::<BTreeMap<_, _>>();
        let upgrade_result = factory.try_batch_upgrade_child_contract(args);

        assert_eq!(
            upgrade_result,
            Err(OdraError::VmError(VmError::InvalidContext))
        );
    }

    #[test]
    #[ignore = "This test does not work on odra vm"]
    fn test_factory_upgrade_fails_for_invalid_arg() {
        let env = odra_test::env();
        // Deploy the factory contract
        let mut factory = CounterFactory::deploy_with_cfg(
            &env,
            NoArgs,
            InstallConfig::upgradable::<CounterFactory>()
        );
        let _ = factory.new_contract(String::from("FromTen"), 10);
        let _ = factory.new_contract(String::from("FromTwo"), 2);
        let _ = factory.new_contract(String::from("FromThree"), 3);
        let _ = factory.new_contract(String::from("FromHundred"), 100);

        // Upgrade the factory contract
        let result = BetterCounterFactory::try_upgrade(&env, factory.address(), NoArgs);
        assert!(result.is_ok());

        let mut factory = result.unwrap();

        let args = vec![("FromTwo".to_string(), 42u32)]
            .into_iter()
            .map(|(contract_name, _)| (contract_name, NoArgs))
            .collect::<BTreeMap<_, _>>();
        let upgrade_result = factory.try_batch_upgrade_child_contract(args);
        assert_eq!(
            upgrade_result,
            Err(OdraError::ExecutionError(ExecutionError::MissingArg))
        );
    }
}



## Example 2

use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18};

#[odra::module(factory=on)]
pub struct FToken {
    /// The CEP-18 token submodule
    token: SubModule<Cep18>,
    /// The Ownable submodule
    ownable: SubModule<Ownable>
}

#[odra::module(factory=on)]
impl FToken {
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, initial_supply: U256) {
        self.token.init(symbol, name, decimals, initial_supply);
        let owner = self.env().caller();
        self.ownable.init(owner);
    }

    delegate! {
        to self.token {
            fn transfer(&mut self, to: &Address, amount: &U256);
            fn balance_of(&self, owner: &Address) -> U256;
            fn total_supply(&self) -> U256;
            fn name(&self) -> String;
            fn symbol(&self) -> String;
        }

        to self.ownable {
            fn get_owner(&self) -> Address;
        }
    }
}

#[odra::module]
pub struct FactoryProxy {
    factory_address: Var<Address>
}

#[odra::module]
impl FactoryProxy {
    pub fn init(&mut self, address: Address) {
        self.factory_address.set(address);
    }

    pub fn deploy_new_contract(&self) -> Address {
        let factory_address = self.factory_address.get().unwrap_or_revert(self);

        let mut factory = FTokenFactoryContractRef::new(self.env(), factory_address);
        let (addr, _uref) = factory.new_contract(
            "TokenContract".to_string(),
            "Token".to_string(),
            "TTK".to_string(),
            18,
            U256::from(1000u64)
        );
        addr
    }
}

#[cfg(test)]
mod tests {
    use alloc::string::ToString;
    use odra::{
        casper_types::U256,
        host::{Deployer, HostRef, NoArgs},
        prelude::Addressable
    };

    use crate::factory::token::{
        FToken as Token, FTokenFactory as TokenFactory, FTokenHostRef,
        FTokenInitArgs as TokenInitArgs, FactoryProxy, FactoryProxyInitArgs
    };

    #[test]
    fn test_standalone_module() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let token = Token::deploy(
            &env,
            TokenInitArgs {
                name: "MyToken".to_string(),
                symbol: "MTK".to_string(),
                decimals: 18,
                initial_supply: U256::from(1000u64)
            }
        );
        assert_eq!(token.get_owner(), owner);
        assert_eq!(token.name(), "MyToken".to_string());
        assert_eq!(token.symbol(), "MTK".to_string());
        assert_eq!(token.total_supply(), U256::from(1000u64));
    }

    #[test]
    #[ignore = "This test does not work on odra vm"]
    fn test_factory_module() {
        let env = odra_test::env();
        let owner = env.get_account(0);
        let mut factory = TokenFactory::deploy(&env, NoArgs);

        let (addr, _) = factory.new_contract(
            "TokenContract".to_string(),
            "Token".to_string(),
            "TTK".to_string(),
            18,
            U256::from(500u64)
        );
        let token = FTokenHostRef::new(addr, env);
        assert_eq!(token.get_owner(), owner);
        assert_eq!(token.name(), "Token".to_string());
        assert_eq!(token.symbol(), "TTK".to_string());
        assert_eq!(token.total_supply(), U256::from(500u64));
    }

    #[test]
    #[ignore = "This test does not work on odra vm"]
    fn test_proxy() {
        let env = odra_test::env();
        let factory = TokenFactory::deploy(&env, NoArgs);
        let proxy = FactoryProxy::deploy(
            &env,
            FactoryProxyInitArgs {
                address: factory.address()
            }
        );

        let addr = proxy.deploy_new_contract();
        let token = FTokenHostRef::new(addr, env);
        assert_eq!(token.get_owner(), proxy.address());
        assert_eq!(token.name(), "Token".to_string());
        assert_eq!(token.symbol(), "TTK".to_string());
        assert_eq!(token.total_supply(), U256::from(1000u64));
    }
}



I will explain this **exactly as it executes on Casper/Odra**, without glossing over the macro magic, because this contract only makes sense once you understand what the `#[module(factory = on)]` flag actually generates.

---

## 1. What `#[odra::module(factory = on)]` Really Means

When you write:

```rust
#[odra::module(factory = on)]
pub struct FToken { ... }
```

Odra generates **three distinct things**, not one:

### (A) The actual contract: `FToken`

This is the CEP-18 token logic + ownership logic.

### (B) A factory contract: `FTokenFactory`

This is a **separate deployed contract** with:

* a `new_contract(...)` entrypoint
* no persistent registry
* no business logic beyond deployment

### (C) Generated references

* `FTokenContractRef`
* `FTokenHostRef`
* `FTokenFactoryContractRef`

These are **typed callers**, not contracts.

This is critical:
👉 **The factory does not “own” the deployed tokens.**
👉 It only deploys them.

---

## 2. How `FToken` Itself Works

### Submodules

```rust
token: SubModule<Cep18>,
ownable: SubModule<Ownable>
```

Odra composes both into **one WASM contract**.

### Initialization flow

```rust
pub fn init(&mut self, name, symbol, decimals, initial_supply)
```

Execution order:

1. `Cep18::init(...)` is called
2. `env().caller()` is captured
3. `Ownable::init(caller)` is called

Who becomes owner depends entirely on **who called `init`**.

This matters later.

---

## 3. What the Factory Actually Does

This call:

```rust
let (addr, _uref) = factory.new_contract(...)
```

does the following internally:

1. The factory calls **Casper’s contract creation syscall**
2. A **brand new contract instance** of `FToken` is deployed
3. `FToken::init(...)` is invoked
4. The **caller of `init` is the factory contract**
5. The factory returns:

   * the deployed contract address
   * a package URef (ignored here)

### Important consequence

```text
owner of token = factory contract address
```

Unless another contract is calling on behalf of someone else.

---

## 4. Why `FactoryProxy` Changes Ownership

### Proxy code

```rust
let mut factory = FTokenFactoryContractRef::new(self.env(), factory_address);
factory.new_contract(...)
```

Execution chain:

```
EOA → FactoryProxy → FTokenFactory → FToken
```

So during `FToken::init()`:

```rust
let owner = self.env().caller();
```

The caller is:

```
FactoryProxy (NOT the factory, NOT the EOA)
```

That is why this assertion passes:

```rust
assert_eq!(token.get_owner(), proxy.address());
```

This is **not accidental**.
It is how Casper enforces call context.

---

## 5. Why the Factory Has No State (and Why That Matters)

Your factory:

```rust
let mut factory = TokenFactory::deploy(&env, NoArgs);
```

Stores:

* ❌ no deployed addresses
* ❌ no registry
* ❌ no validation rules
* ❌ no uniqueness constraints

Each call to:

```rust
new_contract(...)
```

is:

* stateless
* independent
* non-deterministic in address
* impossible to discover later unless you stored the address yourself

This is why this pattern **breaks down for DEX factories**.

---

## 6. Why Tests Are Ignored in Odra VM

```rust
#[ignore = "This test does not work on odra vm"]
```

Because:

* Odra VM does not fully emulate

  * dynamic contract creation
  * package hashes
  * upgrade paths
* Factories rely on **Casper host functions**
* HostRefs behave differently off-chain

So these tests are:

* valid on-chain
* unreliable in VM

This is a known Odra limitation, not your mistake.

---

## 7. What This Pattern Is Actually Good For

This pattern is **perfect** for:

* Token factories
* NFT collection factories
* Template deployments
* Proxy ownership routing
* Controlled deployment pipelines

It is **not** suitable for:

* Uniswap-style pool registries
* Canonical pool uniqueness
* AMM governance logic
* Deterministic address derivation

---

## 8. Mental Model (Keep This)

Think of Odra’s factory as:

> “A typed deployment helper that happens to live on-chain.”

Not as:

> “A governing contract that manages child contracts.”

Once you internalize that, everything in this code becomes consistent.

---

## 9. Bottom Line

* `FToken` is a normal contract
* `FTokenFactory` only deploys
* Ownership is determined by **call depth**
* `FactoryProxy` deliberately hijacks ownership
* There is **no on-chain registry**
* This pattern **cannot replace a Uniswap factory**

If you want, next I can:

* Rewrite this into a **proper DEX factory**
* Show how to deploy pools **without `#[factory]`**
* Explain how to do **pool immutables safely on Casper**
* Or map Uniswap v3 contracts → Odra modules precisely

You are asking the right questions at exactly the right point.
