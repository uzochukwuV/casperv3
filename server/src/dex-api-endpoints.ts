import { Request, Response, Express } from 'express';
import { AppDataSource } from './data-source';
import { PoolRepository } from './repository/pool.repository';
import { LiquidityEventRepository } from './repository/liquidity-event.repository';
import { CollectEventRepository } from './repository/collect-event.repository';
import { TokenTransferRepository } from './repository/token-transfer.repository';
import { TokenApprovalRepository } from './repository/token-approval.repository';
import { PositionRepository } from './repository/position.repository';
import { config } from './config';

let poolRepo: PoolRepository;
let liquidityRepo: LiquidityEventRepository;
let collectRepo: CollectEventRepository;
let tokenTransferRepo: TokenTransferRepository;
let tokenApprovalRepo: TokenApprovalRepository;
let positionRepo: PositionRepository;

// Initialize repositories
async function initializeRepositories() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  poolRepo = new PoolRepository(AppDataSource);
  liquidityRepo = new LiquidityEventRepository(AppDataSource);
  collectRepo = new CollectEventRepository(AppDataSource);
  tokenTransferRepo = new TokenTransferRepository(AppDataSource);
  tokenApprovalRepo = new TokenApprovalRepository(AppDataSource);
  positionRepo = new PositionRepository(AppDataSource);
}

export function registerDexEndpoints(app: Express) {
  console.log('Registering DEX endpoints...');
  
  // Initialize repositories on first request
  app.use(async (req, res, next) => {
    if (!poolRepo) {
      await initializeRepositories();
    }
    next();
  });

  // ===== POOL ENDPOINTS =====
  
  /**
   * GET /api/pools
   * Get all pools with pagination and filtering
   */
  app.get('/api/pools', async (req: Request, res: Response) => {
    try {
      const { token, limit = '50', offset = '0' } = req.query;
      
      let pools;
      if (token) {
        pools = await poolRepo.findByToken(token as string);
      } else {
        pools = await poolRepo.findAll();
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedPools = pools.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        success: true,
        data: paginatedPools,
        total: pools.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/pools/:token0/:token1/:fee
   * Get specific pool by token pair and fee
   */
  app.get('/api/pools/:token0/:token1/:fee', async (req: Request, res: Response) => {
    try {
      const { token0, token1, fee } = req.params;
      const pool = await poolRepo.findByTokensAndFee(token0, token1, parseInt(fee));
      
      if (!pool) {
        return res.status(404).json({ success: false, error: 'Pool not found' });
      }
      
      res.json({ success: true, data: pool });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/pools/stats
   * Get pool statistics
   */
  app.get('/api/pools/stats', async (req: Request, res: Response) => {
    try {
      const pools = await poolRepo.findAll();
      const stats = {
        totalPools: pools.length,
        initializedPools: pools.filter(p => p.initialized).length,
        uninitializedPools: pools.filter(p => !p.initialized).length,
        uniqueTokens: new Set([...pools.map(p => p.token0), ...pools.map(p => p.token1)]).size
      };
      
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== LIQUIDITY EVENT ENDPOINTS =====
  
  /**
   * GET /api/liquidity-events
   * Get liquidity events (mint/burn) with filtering
   */
  app.get('/api/liquidity-events', async (req: Request, res: Response) => {
    try {
      const { poolId, eventType, owner, limit = '50', offset = '0' } = req.query;
      
      let events: any[] = [];
      
      if (poolId) {
        events = await liquidityRepo.findByPool(parseInt(poolId as string));
      } else if (owner) {
        events = await liquidityRepo.findByOwner(owner as string);
      } else if (eventType) {
        events = await liquidityRepo.findByEventType(eventType as 'mint' | 'burn');
      } else {
        // Get recent events from all pools
        const pools = await poolRepo.findAll();
        for (const pool of pools.slice(0, 10)) { // Limit to first 10 pools
          const poolEvents = await liquidityRepo.findByPool(pool.id, 10);
          events.push(...poolEvents);
        }
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedEvents = events.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        success: true,
        data: paginatedEvents,
        total: events.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/liquidity-events/pool/:poolId
   * Get liquidity events for specific pool
   */
  app.get('/api/liquidity-events/pool/:poolId', async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const events = await liquidityRepo.findByPool(parseInt(poolId));
      
      res.json({ success: true, data: events });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/liquidity-events/owner/:owner
   * Get liquidity events for specific owner
   */
  app.get('/api/liquidity-events/owner/:owner', async (req: Request, res: Response) => {
    try {
      const { owner } = req.params;
      const events = await liquidityRepo.findByOwner(owner);
      
      res.json({ success: true, data: events });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== COLLECT EVENT ENDPOINTS =====
  
  /**
   * GET /api/collect-events
   * Get fee collection events
   */
  app.get('/api/collect-events', async (req: Request, res: Response) => {
    try {
      const { poolId, owner, limit = '50', offset = '0' } = req.query;
      
      let events: any[] = [];
      
      if (poolId) {
        events = await collectRepo.findByPool(parseInt(poolId as string));
      } else if (owner) {
        events = await collectRepo.findByOwner(owner as string);
      } else {
        // Get recent events from all pools
        const pools = await poolRepo.findAll();
        for (const pool of pools.slice(0, 10)) {
          const poolEvents = await collectRepo.findByPool(pool.id, 10);
          events.push(...poolEvents);
        }
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedEvents = events.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        success: true,
        data: paginatedEvents,
        total: events.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== TOKEN TRANSFER ENDPOINTS =====
  
  /**
   * GET /api/token-transfers
   * Get token transfer events
   */
  app.get('/api/token-transfers', async (req: Request, res: Response) => {
    try {
      const { tokenAddress, from, to, limit = '50', offset = '0' } = req.query;
      
      let transfers: any[] = [];
      
      if (tokenAddress) {
        transfers = await tokenTransferRepo.findByToken(tokenAddress as string);
      } else if (from || to) {
        const address = (from || to) as string;
        transfers = await tokenTransferRepo.findByAddress(address);
      } else {
        // Get recent transfers from known tokens
        const tokens = await poolRepo.getUniqueTokens();
        for (const token of tokens.slice(0, 5)) {
          const tokenTransfers = await tokenTransferRepo.findByToken(token, 10);
          transfers.push(...tokenTransfers);
        }
        transfers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedTransfers = transfers.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        success: true,
        data: paginatedTransfers,
        total: transfers.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/token-transfers/token/:tokenAddress
   * Get transfers for specific token
   */
  app.get('/api/token-transfers/token/:tokenAddress', async (req: Request, res: Response) => {
    try {
      const { tokenAddress } = req.params;
      const transfers = await tokenTransferRepo.findByToken(tokenAddress);
      
      res.json({ success: true, data: transfers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/token-transfers/account/:account
   * Get transfers for specific account (sent or received)
   */
  app.get('/api/token-transfers/account/:account', async (req: Request, res: Response) => {
    try {
      const { account } = req.params;
      const transfers = await tokenTransferRepo.findByAddress(account);
      
      res.json({ success: true, data: transfers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== TOKEN APPROVAL ENDPOINTS =====
  
  /**
   * GET /api/token-approvals
   * Get token approval events
   */
  app.get('/api/token-approvals', async (req: Request, res: Response) => {
    try {
      const { tokenAddress, owner, spender, limit = '50', offset = '0' } = req.query;
      
      let approvals: any[] = [];
      
      if (tokenAddress) {
        approvals = await tokenApprovalRepo.findByToken(tokenAddress as string);
      } else if (owner) {
        approvals = await tokenApprovalRepo.findByOwner(owner as string);
      } else if (spender) {
        approvals = await tokenApprovalRepo.findBySpender(spender as string);
      } else {
        // Get recent approvals from known tokens
        const tokens = await poolRepo.getUniqueTokens();
        for (const token of tokens.slice(0, 5)) {
          const tokenApprovals = await tokenApprovalRepo.findByToken(token, 10);
          approvals.push(...tokenApprovals);
        }
        approvals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedApprovals = approvals.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        success: true,
        data: paginatedApprovals,
        total: approvals.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== POSITION ENDPOINTS =====
  
  /**
   * GET /api/positions
   * Get NFT positions
   */
  app.get('/api/positions', async (req: Request, res: Response) => {
    try {
      const { owner, poolId, limit = '50', offset = '0' } = req.query;
      
      let positions: any[] = [];
      
      if (owner) {
        positions = await positionRepo.findByOwner(owner as string);
      } else if (poolId) {
        positions = await positionRepo.findByPool(parseInt(poolId as string));
      } else {
        // Get recent positions from all pools
        const pools = await poolRepo.findAll();
        for (const pool of pools.slice(0, 10)) {
          const poolPositions = await positionRepo.findByPool(pool.id);
          positions.push(...poolPositions);
        }
        positions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedPositions = positions.slice(offsetNum, offsetNum + limitNum);
      
      res.json({
        success: true,
        data: paginatedPositions,
        total: positions.length,
        limit: limitNum,
        offset: offsetNum
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/positions/:tokenId
   * Get specific position by token ID
   */
  app.get('/api/positions/:tokenId', async (req: Request, res: Response) => {
    try {
      const { tokenId } = req.params;
      const position = await positionRepo.findByTokenId(tokenId);
      
      if (!position) {
        return res.status(404).json({ success: false, error: 'Position not found' });
      }
      
      res.json({ success: true, data: position });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/positions/owner/:owner
   * Get positions for specific owner
   */
  app.get('/api/positions/owner/:owner', async (req: Request, res: Response) => {
    try {
      const { owner } = req.params;
      const positions = await positionRepo.findByOwner(owner);
      
      res.json({ success: true, data: positions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== ANALYTICS ENDPOINTS =====
  
  /**
   * GET /api/analytics/volume
   * Get trading volume analytics
   */
  app.get('/api/analytics/volume', async (req: Request, res: Response) => {
    try {
      const { poolId, timeframe = '24h' } = req.query;
      
      let events: any[] = [];
      
      if (poolId) {
        events = await liquidityRepo.findByPool(parseInt(poolId as string));
      } else {
        // Get events from all pools
        const pools = await poolRepo.findAll();
        for (const pool of pools) {
          const poolEvents = await liquidityRepo.findByPool(pool.id, 50);
          events.push(...poolEvents);
        }
      }
      
      // Filter by timeframe
      const now = new Date();
      const timeframeMs = timeframe === '24h' ? 24 * 60 * 60 * 1000 : 
                         timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                         30 * 24 * 60 * 60 * 1000; // 30d default
      
      const filteredEvents = events.filter(e => 
        new Date(e.timestamp).getTime() > now.getTime() - timeframeMs
      );
      
      const volume = {
        totalEvents: filteredEvents.length,
        mintEvents: filteredEvents.filter(e => e.eventType === 'mint').length,
        burnEvents: filteredEvents.filter(e => e.eventType === 'burn').length,
        timeframe
      };
      
      res.json({ success: true, data: volume });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/analytics/liquidity
   * Get liquidity analytics
   */
  app.get('/api/analytics/liquidity', async (req: Request, res: Response) => {
    try {
      const pools = await poolRepo.findAll();
      
      let totalLiquidityEvents = 0;
      let recentMints = 0;
      let recentBurns = 0;
      
      // Get events from all pools
      for (const pool of pools) {
        const events = await liquidityRepo.findByPool(pool.id, 100);
        totalLiquidityEvents += events.length;
        
        const recentEvents = events.filter(e => 
          new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );
        
        recentMints += recentEvents.filter(e => e.eventType === 'mint').length;
        recentBurns += recentEvents.filter(e => e.eventType === 'burn').length;
      }
      
      const analytics = {
        totalPools: pools.length,
        activePools: pools.filter(p => p.initialized).length,
        totalLiquidityEvents,
        recentMints,
        recentBurns
      };
      
      res.json({ success: true, data: analytics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== SYSTEM ENDPOINTS =====
  
  /**
   * GET /api/system/contracts
   * Get deployed contract information
   */
  app.get('/api/system/contracts', async (req: Request, res: Response) => {
    try {
      const contractInfo = {
        dex: {
          packageHash: config.dexContractPackageHash,
          name: 'UnifiedDEX',
          type: 'core'
        },
        router: {
          packageHash: config.routerContractPackageHash,
          name: 'Router',
          type: 'core'
        },
        positionManager: {
          packageHash: config.positionManagerContractPackageHash,
          name: 'PositionManager',
          type: 'core'
        },
        tokens: config.tokens
      };
      
      res.json({ success: true, data: contractInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/system/health
   * System health check with database connectivity
   */
  app.get('/api/system/health', async (req: Request, res: Response) => {
    try {
      const pools = await poolRepo.findAll();
      const health = {
        status: 'healthy',
        database: 'connected',
        totalPools: pools.length,
        timestamp: new Date().toISOString()
      };
      
      res.json({ success: true, data: health });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        data: { 
          status: 'unhealthy', 
          database: 'disconnected',
          error: error.message 
        } 
      });
    }
  });
}