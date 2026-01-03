cargo run --bin dex_contracts_cli  deploy
warning: profiles for the non root package will be ignored, specify profiles at the workspace root:
package:   /mnt/e/apps/casper/v3/smart-contract/dex-contracts/Cargo.toml
workspace: /mnt/e/apps/casper/v3/smart-contract/Cargo.toml
warning: fields `ticks` and `tick_bitmaps` are never read
  --> dex-contracts/src/unified_dex.rs:62:5
   |
54 | pub struct UnifiedDex {
   |            ---------- fields in this struct
...
62 |     ticks: Mapping<([u8; 32], i32), Tick>,
   |     ^^^^^
63 |     positions: Mapping<([u8; 32], [u8; 32]), Position>,
64 |     tick_bitmaps: Mapping<[u8; 32], Mapping<i16, U256>>,
   |     ^^^^^^^^^^^^
   |
   = note: `#[warn(dead_code)]` on by default

warning: `dex-contracts` (lib) generated 1 warning
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 8.77s
     Running `/mnt/e/apps/casper/v3/smart-contract/target/debug/dex_contracts_cli deploy`

🚀 Deploying CasperSwap V3 Unified DEX...

1️⃣  Deploying UnifiedDex...
💁  INFO : Found wasm under "/mnt/e/apps/casper/v3/smart-contract/dex-contracts/wasm/UnifiedDex.wasm".
💁  INFO : Deploying "UnifiedDex".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(579346d55a0037f3a0fb759aeda4cd81960265dcded68f1227eadd4dc1072359)).
💁  INFO : Transaction "579346d55a0037f3a0fb759aeda4cd81960265dcded68f1227eadd4dc1072359" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/579346d55a0037f3a0fb759aeda4cd81960265dcded68f1227eadd4dc1072359
💁  INFO : Contract "contract-package-9b94d531ff41c5f9c54849f30e5310b349e58c5a189da3039407eb7241e253b0" deployed.
   ✅ UnifiedDex deployed at: Contract(ContractPackageHash(9b94d531ff41c5f9c54849f30e5310b349e58c5a189da3039407eb7241e253b0))

2️⃣  Deploying UnifiedPositionManager...
💁  INFO : Found wasm under "/mnt/e/apps/casper/v3/smart-contract/dex-contracts/wasm/UnifiedPositionManager.wasm".
💁  INFO : Deploying "UnifiedPositionManager".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(d5bf317590246e18d229b963cb92c6e9cbfaff96fb94bd4bd6d9ac89e5a471c7)).
💁  INFO : Transaction "d5bf317590246e18d229b963cb92c6e9cbfaff96fb94bd4bd6d9ac89e5a471c7" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/d5bf317590246e18d229b963cb92c6e9cbfaff96fb94bd4bd6d9ac89e5a471c7
💁  INFO : Contract "contract-package-fa148c2e9d27ab7a2eac9a6ad0417aedf516f90a316d912327f4d1dd8e47f6ff" deployed.
   ✅ UnifiedPositionManager deployed at: Contract(ContractPackageHash(fa148c2e9d27ab7a2eac9a6ad0417aedf516f90a316d912327f4d1dd8e47f6ff))

3️⃣  Deploying Test Tokens...
💁  INFO : Found wasm under "/mnt/e/apps/casper/v3/smart-contract/dex-contracts/wasm/TestToken.wasm".
💁  INFO : Deploying "TestToken".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(fa3039033059f3239ce1a3cbe1474e74e6baf4759dff95642823b3bb50d3b6ab)).
💁  INFO : Transaction "fa3039033059f3239ce1a3cbe1474e74e6baf4759dff95642823b3bb50d3b6ab" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/fa3039033059f3239ce1a3cbe1474e74e6baf4759dff95642823b3bb50d3b6ab
💁  INFO : Contract "contract-package-f5601f13106159f5aa4ceed2e66c1ad0b89106361b4e0d1ef20799e91e423459" deployed.
   ✅ WCSPR deployed at: Contract(ContractPackageHash(f5601f13106159f5aa4ceed2e66c1ad0b89106361b4e0d1ef20799e91e423459))
💁  INFO : Found wasm under "/mnt/e/apps/casper/v3/smart-contract/dex-contracts/wasm/TestToken.wasm".
💁  INFO : Deploying "TestToken".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(0a6147a4f3cca6908b4aed02ea11f012df08c455a280327f895a4f71e0b9fb1d)).
💁  INFO : Transaction "0a6147a4f3cca6908b4aed02ea11f012df08c455a280327f895a4f71e0b9fb1d" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/0a6147a4f3cca6908b4aed02ea11f012df08c455a280327f895a4f71e0b9fb1d
💁  INFO : Contract "contract-package-14911061364be1c9010b568df80bd01551122b3db28b1d6d5856965ef012c452" deployed.
   ✅ USDC deployed at: Contract(ContractPackageHash(14911061364be1c9010b568df80bd01551122b3db28b1d6d5856965ef012c452))

4️⃣  Creating test pool...
💁  INFO : Calling "contract-package-9b94d531ff41c5f9c54849f30e5310b349e58c5a189da3039407eb7241e253b0" with entrypoint "create_pool" through proxy.  
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(b618e701772644b7f76954e5250e901e1024c9a13cd2c4955735a844afd1157e)).
💁  INFO : Transaction "b618e701772644b7f76954e5250e901e1024c9a13cd2c4955735a844afd1157e" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/b618e701772644b7f76954e5250e901e1024c9a13cd2c4955735a844afd1157e
thread 'main' panicked at /home/uzo/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/odra-casper-rpc-client-2.4.0/src/casper_client.rs:458:13:
Couldn't get state root hash from node: "https://node.testnet.casper.network"
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace