import 'reflect-metadata';
import http from 'http';
import path from 'path';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { config } from './config';
import { registerDexEndpoints } from './dex-api-endpoints';
import fs from 'fs';

const app: Express = express();
app.use(cors<Request>());
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);

async function main() {
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

  server.listen(config.httpPort, () => console.log(`Uzzy3 DEX API running on http://localhost:${config.httpPort}`));
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