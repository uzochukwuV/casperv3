import { config } from './config';
import WebSocket from 'ws';
import { AppDataSource } from './data-source';
import { PoolRepository } from './repository/pool.repository';
import { LiquidityEventRepository } from './repository/liquidity-event.repository';
import { TokenTransferRepository } from './repository/token-transfer.repository';
import { TokenApprovalRepository } from './repository/token-approval.repository';
import { PositionRepository } from './repository/position.repository';
import { CollectEventRepository } from './repository/collect-event.repository';

// Helper function to strip address prefixes
function stripAddressPrefix(address: string): string {
  if (!address) return address;

  // Remove common Casper address prefixes
  const prefixes = ['account-hash-', 'hash-', 'contract-', 'uref-'];

  for (const prefix of prefixes) {
    if (address.startsWith(prefix)) {
      return address.substring(prefix.length);
    }
  }

  return address;
}

interface ContractConfig {
  packageHash: string;
  name: string;
  type: 'dex' | 'token' | 'position_manager' | 'router';
}

class MultiContractEventListener {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  // Repositories
  private poolRepository: PoolRepository;
  private liquidityEventRepository: LiquidityEventRepository;
  private tokenTransferRepository: TokenTransferRepository;
  private tokenApprovalRepository: TokenApprovalRepository;
  private positionRepository: PositionRepository;
  private collectEventRepository: CollectEventRepository;

  // Core contracts to always monitor
  private coreContracts: ContractConfig[] = [
    {
      packageHash: config.dexContractPackageHash,
      name: 'UnifiedDEX',
      type: 'dex'
    },
    {
      packageHash: config.positionManagerContractPackageHash,
      name: 'PositionManager',
      type: 'position_manager'
    },
    {
      packageHash: config.routerContractPackageHash,
      name: 'Router',
      type: 'router'
    }
  ];

  // Dynamic token contracts (added when pools are created)
  private tokenContracts: Map<string, ContractConfig> = new Map();

  async start() {
    console.log('🚀 Starting Multi-Contract Event Listener...');
    
    // Initialize database connection
    await AppDataSource.initialize();
    
    // Initialize repositories
    this.poolRepository = new PoolRepository(AppDataSource);
    this.liquidityEventRepository = new LiquidityEventRepository(AppDataSource);
    this.tokenTransferRepository = new TokenTransferRepository(AppDataSource);
    this.tokenApprovalRepository = new TokenApprovalRepository(AppDataSource);
    this.positionRepository = new PositionRepository(AppDataSource);
    this.collectEventRepository = new CollectEventRepository(AppDataSource);
    
    // Connect to core contracts
    for (const contract of this.coreContracts) {
      await this.connectToContract(contract);
    }

    // Load existing token contracts from database
    await this.loadExistingTokenContracts();
  }

  private async connectToContract(contract: ContractConfig) {
    const url = `${config.csprCloudStreamingUrl}/contract-events?contract_package_hash=${contract.packageHash}`;
    
    console.log(`🔌 Connecting to ${contract.name} (${contract.type})...`);

    const ws = new WebSocket(url, {
      headers: {
        authorization: config.csprCloudAccessKey,
      },
    });

    ws.on('open', () => {
      console.log(`✅ Connected to ${contract.name}`);
      this.reconnectAttempts.set(contract.packageHash, 0);
    });

    ws.on('message', async (data: Buffer) => {
      await this.handleMessage(data, contract);
    });

    ws.on('error', (err) => {
      console.log(`❌ ${contract.name} WebSocket error: ${err.message}`);
      this.handleReconnect(contract);
    });

    ws.on('close', () => {
      console.log(`🔌 Disconnected from ${contract.name}`);
      this.handleReconnect(contract);
    });

    this.connections.set(contract.packageHash, ws);
  }

  private async handleMessage(data: Buffer, contract: ContractConfig) {
    const rawData = data.toString();

    if (rawData === 'Ping') {
      return;
    }

    try {
      const event = JSON.parse(rawData);
      
      console.log(`📡 Event from ${contract.name}:`, {
        eventName: event.data?.name,
        contractType: contract.type,
        deployHash: event.extra?.deploy_hash
      });

      // Route to appropriate handler based on contract type
      switch (contract.type) {
        case 'dex':
          await this.handleDEXEvent(event);
          break;
        case 'token':
          await this.handleTokenEvent(event, contract);
          break;
        case 'position_manager':
          await this.handlePositionManagerEvent(event);
          break;
        case 'router':
          await this.handleRouterEvent(event);
          break;
      }

    } catch (err) {
      console.log(`❌ Error parsing event from ${contract.name}:`, err);
    }
  }

  private async handleDEXEvent(event: any) {
    const eventName = event.data?.name;
    const eventData = event.data?.data;
    console.log('🔎 DEX Event Details:', event);

    switch (eventName) {
      case 'PoolCreated':
        console.log('🏊 Pool Created:', {
          token0: eventData.token0,
          token1: eventData.token1,
          fee: eventData.fee
        });
        
        // Add token contracts to monitoring if not already added
        await this.addTokenContract(eventData.token0);
        await this.addTokenContract(eventData.token1);
        
        // Store pool in database
        await this.storePoolCreated(eventData, event.extra);
        break;

      case 'Initialize':
        console.log('🚀 Pool Initialized:', {
          sqrtPriceX96: eventData.sqrt_price_x96,
          tick: eventData.tick
        });
        await this.storePoolInitialized(eventData, event.extra);
        break;

      case 'Mint':
        console.log('💰 Liquidity Added:', {
          sender: eventData.sender,
          owner: eventData.owner,
          amount: eventData.amount
        });
        await this.storeMintEvent(eventData, event.extra);
        break;

      case 'Burn':
        console.log('🔥 Liquidity Removed:', {
          owner: eventData.owner,
          amount: eventData.amount
        });
        await this.storeBurnEvent(eventData, event.extra);
        break;

      case 'Collect':
        console.log('💸 Fees Collected:', {
          owner: eventData.owner,
          recipient: eventData.recipient
        });
        await this.storeCollectEvent(eventData, event.extra);
        break;

      default:
        console.log('❓ Unknown DEX event:', eventName);
    }
  }

  private async handleTokenEvent(event: any, contract: ContractConfig) {
    const eventName = event.data?.name;
    const eventData = event.data?.data;

    switch (eventName) {
      case 'Transfer':
        console.log(`💳 Token Transfer (${contract.name}):`, {
          from: eventData.from,
          to: eventData.to,
          amount: eventData.amount
        });
        await this.storeTokenTransfer(eventData, event.extra, contract.packageHash);
        break;

      case 'Approval':
        console.log(`✅ Token Approval (${contract.name}):`, {
          owner: eventData.owner,
          spender: eventData.spender,
          amount: eventData.amount
        });
        await this.storeTokenApproval(eventData, event.extra, contract.packageHash);
        break;

      default:
        console.log(`❓ Unknown token event from ${contract.name}:`, eventName);
    }
  }

  private async handlePositionManagerEvent(event: any) {
    const eventName = event.data?.name;
    console.log('🎯 Position Manager Event:', eventName);
    // Handle position manager specific events
  }

  private async handleRouterEvent(event: any) {
    const eventName = event.data?.name;
    console.log('🛣️ Router Event:', eventName);
    // Handle router specific events
  }

  // Public method to manually add token contracts while running
  async addTokenContractManually(tokenAddress: string, tokenSymbol?: string) {
    if (this.tokenContracts.has(tokenAddress)) {
      console.log(`⚠️ Token ${tokenAddress} is already being monitored`);
      return false;
    }

    const tokenContract: ContractConfig = {
      packageHash: tokenAddress,
      name: tokenSymbol ? `Token-${tokenSymbol}` : `Token-${tokenAddress.slice(0, 8)}`,
      type: 'token'
    };

    this.tokenContracts.set(tokenAddress, tokenContract);
    await this.connectToContract(tokenContract);
    
    console.log(`➕ Manually added token contract: ${tokenContract.name} (${tokenAddress})`);
    return true;
  }

  // Get list of currently monitored contracts
  getMonitoredContracts() {
    return {
      core: this.coreContracts,
      tokens: Array.from(this.tokenContracts.values()),
      totalConnections: this.connections.size
    };
  }

  private async addTokenContract(tokenAddress: string) {
    // Strip any address prefix before using
    const cleanAddress = stripAddressPrefix(tokenAddress);

    if (this.tokenContracts.has(cleanAddress)) {
      return; // Already monitoring
    }

    const tokenContract: ContractConfig = {
      packageHash: cleanAddress,
      name: `Token-${cleanAddress.slice(0, 8)}`,
      type: 'token'
    };

    this.tokenContracts.set(cleanAddress, tokenContract);
    await this.connectToContract(tokenContract);

    console.log(`➕ Added token contract to monitoring: ${cleanAddress}`);
  }

  private async loadExistingTokenContracts() {
    console.log('📚 Loading existing token contracts from database...');
    
    try {
      // Get unique token addresses from pools table
      const tokens = await this.poolRepository.getUniqueTokens();
      
      for (const tokenAddress of tokens) {
        await this.addTokenContract(tokenAddress);
      }
      
      console.log(`✅ Loaded ${tokens.length} existing token contracts from database`);
    } catch (error) {
      console.log('⚠️ Error loading existing token contracts:', error);
      
      // Fallback to config tokens
      const commonTokens = [
'd038947f02171806e38d7ccf66d3aff5944cc423d085417adbabf3dc1b26c4b0',
'df57c51153d165dbea1c9dd220274eb6445fb9b3826c2e23aade3ccd5f0187bb',
'29f1f52b65c171703bb74d2887cf7a6dcec8d833192ff1b221c5e56d1aabd1e1',
      ].filter(Boolean);
      
      for (const tokenAddress of commonTokens) {
        await this.addTokenContract(tokenAddress);
      }
      
      console.log(`✅ Loaded ${commonTokens.length} fallback token contracts`);
    }
  }

  private handleReconnect(contract: ContractConfig) {
    const attempts = this.reconnectAttempts.get(contract.packageHash) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
      
      console.log(`🔄 Reconnecting to ${contract.name} in ${delay}ms (attempt ${attempts + 1})`);
      
      setTimeout(() => {
        this.reconnectAttempts.set(contract.packageHash, attempts + 1);
        this.connectToContract(contract);
      }, delay);
    } else {
      console.log(`💀 Max reconnection attempts reached for ${contract.name}`);
    }
  }

  // Database storage methods
  private async storePoolCreated(eventData: any, extra: any) {
    try {
      const pool = await this.poolRepository.save({
        token0: stripAddressPrefix(eventData.token0),
        token1: stripAddressPrefix(eventData.token1),
        fee: eventData.fee,
        tickSpacing: eventData.tick_spacing,
        poolAddress: stripAddressPrefix(eventData.pool),
        deployHash: extra.deploy_hash,
        initialized: false
      });
      console.log('💾 Stored pool created event:', pool.id);
    } catch (error) {
      console.error('❌ Error storing pool created event:', error);
    }
  }

  private async storePoolInitialized(eventData: any, extra: any) {
    try {
      // Find the pool by looking up recent pools with matching deploy hash or by token pair
      const pools = await this.poolRepository.findAll();
      const pool = pools.find(p => !p.initialized); // Find first uninitialized pool
      
      if (pool) {
        await this.poolRepository.updateInitialization(
          pool.id,
          eventData.sqrt_price_x96,
          eventData.tick
        );
        console.log('💾 Stored pool initialized event for pool:', pool.id);
      }
    } catch (error) {
      console.error('❌ Error storing pool initialized event:', error);
    }
  }

  private async storeMintEvent(eventData: any, extra: any) {
    try {
      // Find pool by sender or other identifying info
      const pools = await this.poolRepository.findAll();
      const pool = pools[0]; // Simplified - in production, match by contract context
      
      if (pool) {
        await this.liquidityEventRepository.save({
          eventType: 'mint',
          poolId: pool.id,
          sender: eventData.sender,
          owner: eventData.owner,
          tickLower: eventData.tick_lower,
          tickUpper: eventData.tick_upper,
          amount: eventData.amount,
          amount0: eventData.amount0,
          amount1: eventData.amount1,
          deployHash: extra.deploy_hash
        });
        console.log('💾 Stored mint event for pool:', pool.id);
      }
    } catch (error) {
      console.error('❌ Error storing mint event:', error);
    }
  }

  private async storeBurnEvent(eventData: any, extra: any) {
    try {
      const pools = await this.poolRepository.findAll();
      const pool = pools[0]; // Simplified
      
      if (pool) {
        await this.liquidityEventRepository.save({
          eventType: 'burn',
          poolId: pool.id,
          sender: eventData.owner, // Burn events don't have separate sender
          owner: eventData.owner,
          tickLower: eventData.tick_lower,
          tickUpper: eventData.tick_upper,
          amount: eventData.amount,
          amount0: eventData.amount0,
          amount1: eventData.amount1,
          deployHash: extra.deploy_hash
        });
        console.log('💾 Stored burn event for pool:', pool.id);
      }
    } catch (error) {
      console.error('❌ Error storing burn event:', error);
    }
  }

  private async storeCollectEvent(eventData: any, extra: any) {
    try {
      const pools = await this.poolRepository.findAll();
      const pool = pools[0]; // Simplified
      
      if (pool) {
        await this.collectEventRepository.save({
          poolId: pool.id,
          owner: eventData.owner,
          recipient: eventData.recipient,
          tickLower: eventData.tick_lower,
          tickUpper: eventData.tick_upper,
          amount0: eventData.amount0,
          amount1: eventData.amount1,
          deployHash: extra.deploy_hash
        });
        console.log('💾 Stored collect event for pool:', pool.id);
      }
    } catch (error) {
      console.error('❌ Error storing collect event:', error);
    }
  }

  private async storeTokenTransfer(eventData: any, extra: any, tokenAddress: string) {
    try {
      await this.tokenTransferRepository.save({
        tokenAddress,
        from: eventData.from,
        to: eventData.to,
        amount: eventData.amount,
        deployHash: extra.deploy_hash
      });
      console.log('💾 Stored token transfer event for:', tokenAddress);
    } catch (error) {
      console.error('❌ Error storing token transfer event:', error);
    }
  }

  private async storeTokenApproval(eventData: any, extra: any, tokenAddress: string) {
    try {
      await this.tokenApprovalRepository.save({
        tokenAddress,
        owner: eventData.owner,
        spender: eventData.spender,
        amount: eventData.amount,
        deployHash: extra.deploy_hash
      });
      console.log('💾 Stored token approval event for:', tokenAddress);
    } catch (error) {
      console.error('❌ Error storing token approval event:', error);
    }
  }

  async stop() {
    console.log('🛑 Stopping Multi-Contract Event Listener...');
    
    for (const [packageHash, ws] of this.connections) {
      ws.close();
    }
    
    this.connections.clear();
    this.reconnectAttempts.clear();
  }
}

// Usage
async function main() {
  const listener = new MultiContractEventListener();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await listener.stop();
    process.exit(0);
  });

  await listener.start();
  
  console.log('🎧 Multi-contract event listener is running...');
  console.log('💡 Will automatically discover and monitor new token contracts when pools are created');
  console.log('🔧 To manually add a token contract, call: listener.addTokenContractManually("contract-hash", "SYMBOL")');
  
  // Example: Add a token manually after 10 seconds (for testing)
  setTimeout(async () => {
    console.log('\n🧪 Testing manual token addition...');
    await listener.addTokenContractManually('df57c51153d165dbea1c9dd220274eb6445fb9b3826c2e23aade3ccd5f0187bb', 'USDC');
    
    // Show current monitored contracts
    const monitored = listener.getMonitoredContracts();
    console.log('📊 Currently monitoring:', {
      coreContracts: monitored.core.length,
      tokenContracts: monitored.tokens.length,
      totalConnections: monitored.totalConnections
    });
  }, 10000);
  
  // Keep the process running
  process.stdin.resume();
}

main().catch(console.error);