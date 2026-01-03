import { config } from './config';
import WebSocket from 'ws';

async function main() {
  console.log('Testing DEX Event Handler...');
  console.log('DEX Contract Hash:', config.dexContractPackageHash);
  console.log('Streaming URL:', config.csprCloudStreamingUrl);
  
  const ws = new WebSocket(
    `${config.csprCloudStreamingUrl}/contract-events?contract_package_hash=${"df57c51153d165dbea1c9dd220274eb6445fb9b3826c2e23aade3ccd5f0187bb"}`,
    {
      headers: {
        authorization: config.csprCloudAccessKey,
      },
    },
  );

  ws.on('open', () => {
    console.log('✓ Connected to DEX streaming API');
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
      console.log('🎉 New DEX event received:', rawData);
      
      const event = JSON.parse(rawData);
      
      // Simple event detection
      if (event.data?.data?.token0 && event.data?.data?.token1) {
        console.log('🏊 Pool Created Event');
      } else if (event.data?.data?.sqrt_price_x96) {
        console.log('🚀 Pool Initialize Event');
      } else if (event.data?.data?.sender && event.data?.data?.amount) {
        console.log('💰 Mint Event (Liquidity Added)');
      } else if (event.data?.data?.owner && event.data?.data?.amount && !event.data?.data?.sender) {
        console.log('🔥 Burn Event (Liquidity Removed)');
      } else if (event.data?.data?.recipient) {
        console.log('💸 Collect Event (Fees Collected)');
      } else {
        console.log('❓ Unknown Event Type');
      }
      
    } catch (err) {
      console.log('❌ Error parsing DEX event:', err);
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

  console.log('👂 Listening for DEX events...');
  console.log('💡 To test: Create a pool or add liquidity using the frontend');
}

main();