import { DataSource, Repository } from 'typeorm';
import { Pool } from '../entity/pool.entity';

export class PoolRepository {
  private repository: Repository<Pool>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Pool);
  }

  async save(poolData: Partial<Pool>): Promise<Pool> {
    const pool = this.repository.create(poolData);
    return await this.repository.save(pool);
  }

  async findByTokensAndFee(token0: string, token1: string, fee: number): Promise<Pool | null> {
    return await this.repository.findOne({
      where: { token0, token1, fee }
    });
  }

  async updateInitialization(poolId: number, sqrtPriceX96: string, tick: number): Promise<void> {
    await this.repository.update(poolId, {
      sqrtPriceX96,
      tick,
      initialized: true
    });
  }

  async findAll(): Promise<Pool[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findByToken(tokenAddress: string): Promise<Pool[]> {
    return await this.repository.find({
      where: [
        { token0: tokenAddress },
        { token1: tokenAddress }
      ],
      order: { createdAt: 'DESC' }
    });
  }

  async getUniqueTokens(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder('pool')
      .select('token0', 'token')
      .addSelect('token1', 'token')
      .getRawMany();
    
    const tokens = new Set<string>();
    result.forEach(row => {
      if (row.token0) tokens.add(row.token0);
      if (row.token1) tokens.add(row.token1);
    });
    
    return Array.from(tokens);
  }
}