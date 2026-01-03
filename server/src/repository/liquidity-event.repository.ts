import { DataSource, Repository } from 'typeorm';
import { LiquidityEvent } from '../entity/liquidity-event.entity';

export class LiquidityEventRepository {
  private repository: Repository<LiquidityEvent>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(LiquidityEvent);
  }

  async save(eventData: Partial<LiquidityEvent>): Promise<LiquidityEvent> {
    const event = this.repository.create(eventData);
    return await this.repository.save(event);
  }

  async findByPool(poolId: number, limit: number = 100): Promise<LiquidityEvent[]> {
    return await this.repository.find({
      where: { poolId },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pool']
    });
  }

  async findByOwner(owner: string, limit: number = 100): Promise<LiquidityEvent[]> {
    return await this.repository.find({
      where: { owner },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pool']
    });
  }

  async findByEventType(eventType: 'mint' | 'burn', limit: number = 100): Promise<LiquidityEvent[]> {
    return await this.repository.find({
      where: { eventType },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pool']
    });
  }

  async getPoolLiquidityStats(poolId: number): Promise<{
    totalMints: number;
    totalBurns: number;
    totalVolume0: string;
    totalVolume1: string;
  }> {
    const stats = await this.repository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CAST(event.amount0 as DECIMAL))', 'totalAmount0')
      .addSelect('SUM(CAST(event.amount1 as DECIMAL))', 'totalAmount1')
      .where('event.poolId = :poolId', { poolId })
      .groupBy('event.eventType')
      .getRawMany();

    const result = {
      totalMints: 0,
      totalBurns: 0,
      totalVolume0: '0',
      totalVolume1: '0'
    };

    stats.forEach(stat => {
      if (stat.eventType === 'mint') {
        result.totalMints = parseInt(stat.count);
      } else if (stat.eventType === 'burn') {
        result.totalBurns = parseInt(stat.count);
      }
      result.totalVolume0 = (BigInt(result.totalVolume0) + BigInt(stat.totalAmount0 || 0)).toString();
      result.totalVolume1 = (BigInt(result.totalVolume1) + BigInt(stat.totalAmount1 || 0)).toString();
    });

    return result;
  }
}