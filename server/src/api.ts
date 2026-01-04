import 'reflect-metadata';


import 'reflect-metadata';
import http from 'http';
import path from 'path';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { config } from './config';
import { registerDexEndpoints } from './dex-api-endpoints';
import { AppDataSource } from './data-source';
import fs from 'fs';

const app: Express = express();
app.use(cors<Request>());
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);

async function main() {
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    
    // Serve proxy WASM file
    app.get('/proxy-wasm', async (_: Request, res: Response) => {
      fs.createReadStream(path.resolve(__dirname, `./resources/UnifiedDex.wasm`)).pipe(res);
    });

    // Register DEX endpoints
    registerDexEndpoints(app);
    
    // Health check
    app.get('/health', async (_: Request, res: Response) => {
      res.status(200).json({ status: 'UP', message: 'Uzzy3 DEX API is running' });
    });

    // Global error handler
    app.use((error: any, req: Request, res: Response, next: any) => {
      console.error('API Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      });
    });

    server.listen(config.httpPort, () => {
      console.log(`🚀 Uzzy3 DEX API running on http://localhost:${config.httpPort}`);
      console.log('📊 Available endpoints:');
      console.log('  - GET  /api/pools - Get all pools');
      console.log('  - GET  /api/liquidity-events - Get liquidity events');
      console.log('  - GET  /api/token-transfers - Get token transfers');
      console.log('  - GET  /api/positions - Get NFT positions');
      console.log('  - GET  /api/analytics/volume - Get volume analytics');
      console.log('  - GET  /api/system/health - System health check');
    });
  } catch (error) {
    console.error('❌ Failed to start API server:', error);
    process.exit(1);
  }
}

main();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  try {
    process.exit(0);
  } catch (err) {
    console.log(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}