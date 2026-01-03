import 'reflect-metadata';
import { config } from './config';
import WebSocket from 'ws';
import axios from 'axios';
// import { AppDataSource } from './data-source'; // Commented out for testing
// DEX Event Types
interface DexEvent<T> {
  data: {
    data: T;
  };
  extra: {
    deploy_hash: string;
  };
}

interface PoolCreatedEvent {
  token0: string;
  token1: string;
  fee: number;
  tick_spacing: number;
  pool: string;
}

interface InitializeEvent {
  sqrt_price_x96: string;
  tick: number;
}

interface MintEvent {
  sender: string;
  owner: string;
  tick_lower: number;
  tick_upper: number;
  amount: string;
  amount0: string;
  amount1: string;
}

interface BurnEvent {
  owner: string;
  tick_lower: number;
  tick_upper: number;
  amount: string;
  amount0: string;
  amount1: string;
}

interface CollectEvent {
  owner: string;
  recipient: string;
  tick_lower: number;
  tick_upper: number;
  amount0: string;
  amount1: string;
}

async function fetchHistoricalEvents() {
  console.log('Fetching historical DEX events...');
  
  try {
    // Get contract events from CSPR.cloud API
    const response = await axios.get(
      `${config.csprCloudApiUrl}/contract-packages/${config.dexContractPackageHash}/events`,
      {
        headers: {
          authorization: config.csprCloudAccessKey,
        },
        params: {
          page: 1,
          limit: 100, // Adjust as needed
        },
      }
    );
    console.log('Historical events response received', response.data);
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} historical events`);
      
      for (const event of response.data.data) {
        console.log('Historical event:', {
          event_type: event.event_type_name,
          deploy_hash: event.deploy_hash,
          timestamp: event.timestamp,
          data: event.data
        });
        
        // Process the event same as real-time events
        await processEvent(event);
      }
    }
  } catch (error: any) {
    console.error('Error fetching historical events:', error.response?.data || error.message);
  }
}

async function processEvent(event: any) {
  try {
    // Handle different event types based on event_type_name or data structure
    if (event.event_type_name === 'PoolCreated' || (event.data?.token0 && event.data?.token1)) {
      console.log('📊 Pool Created:', {
        token0: event.data.token0,
        token1: event.data.token1,
        fee: event.data.fee,
        deploy_hash: event.deploy_hash
      });
      
    } else if (event.event_type_name === 'Initialize' || event.data?.sqrt_price_x96) {
      console.log('🚀 Pool Initialized:', {
        sqrt_price_x96: event.data.sqrt_price_x96,
        tick: event.data.tick,
        deploy_hash: event.deploy_hash
      });
      
    } else if (event.event_type_name === 'Mint' || (event.data?.sender && event.data?.amount)) {
      console.log('💰 Liquidity Added:', {
        sender: event.data.sender,
        owner: event.data.owner,
        amount: event.data.amount,
        amount0: event.data.amount0,
        amount1: event.data.amount1,
        deploy_hash: event.deploy_hash
      });
      
    } else if (event.event_type_name === 'Burn' || (event.data?.owner && event.data?.amount && !event.data?.sender)) {
      console.log('🔥 Liquidity Removed:', {
        owner: event.data.owner,
        amount: event.data.amount,
        amount0: event.data.amount0,
        amount1: event.data.amount1,
        deploy_hash: event.deploy_hash
      });
      
    } else if (event.event_type_name === 'Collect' || event.data?.recipient) {
      console.log('💸 Fees Collected:', {
        owner: event.data.owner,
        recipient: event.data.recipient,
        amount0: event.data.amount0,
        amount1: event.data.amount1,
        deploy_hash: event.deploy_hash
      });
    }
    
    // Store in database here
    // await saveEventToDatabase(event);
    
  } catch (err) {
    console.log('Error processing event:', err);
  }
}

async function main() {
  // await AppDataSource.initialize(); // Commented out for testing
  console.log('Starting DEX Event Handler (no database)...');
  console.log('DEX Contract Package Hash:', config.dexContractPackageHash);
  
  // First, fetch historical events
  await fetchHistoricalEvents();
  
  console.log('\nNow listening for real-time events...');
  
  const ws = new WebSocket(
    `${config.csprCloudStreamingUrl}/contract-events?contract_package_hash=${config.dexContractPackageHash}`,
    {
      headers: {
        authorization: config.csprCloudAccessKey,
      },
    },
  );

  ws.on('open', () => {
    console.log(`✅ Connected to DEX streaming API`);
  });

  let lastPingTimestamp = new Date();

  setInterval(() => {
    const now = new Date();
    if (now.getTime() - lastPingTimestamp.getTime() > 30000) {
      console.log('No ping events for 30 seconds, closing connection...');
      ws.close();
      process.exit(1);
    }
  }, 30000);

  ws.on('message', async (data: Buffer) => {
    const rawData = data.toString();

    if (rawData === 'Ping') {
      lastPingTimestamp = new Date();
      console.log('📡 Ping received');
      return;
    }

    try {
      console.log('🎉 New real-time DEX event:', rawData);
      
      const event = JSON.parse(rawData);
      
      // Process real-time event using same function
      await processEvent({
        event_type_name: 'Unknown', // Real-time events might not have this
        deploy_hash: event.extra?.deploy_hash,
        timestamp: new Date().toISOString(),
        data: event.data?.data
      });
      
    } catch (err) {
      console.log('❌ Error parsing real-time DEX event:', err);
    }
  });

  ws.on('error', (err) => {
    console.log(`❌ WebSocket error: ${err.message}`);
    ws.close();
    process.exit(1);
  });

  ws.on('close', () => {
    console.log('🔌 Disconnected from DEX Streaming API');
    process.exit(1);
  });

  console.log('👂 DEX Event Handler is running...');
}

main();