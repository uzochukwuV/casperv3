import { DataSource, Repository } from 'typeorm';
import { CollectEvent } from '../entity/collect-event.entity';

export class CollectEventRepository {
  private repository: Repository<CollectEvent>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(CollectEvent);
  }

  async save(collectData: Partial<CollectEvent>): Promise<CollectEvent> {
    const collect = this.repository.create(collectData);
    return await this.repository.save(collect);
  }

  async findByPool(poolId: number, limit: number = 100): Promise<CollectEvent[]> {
    return await this.repository.find({
      where: { poolId },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pool']
    });
  }

  async findByOwner(owner: string, limit: number = 100): Promise<CollectEvent[]> {
    return await this.repository.find({
      where: { owner },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pool']
    });
  }

  async findByRecipient(recipient: string, limit: number = 100): Promise<CollectEvent[]> {
    return await this.repository.find({
      where: { recipient },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['pool']
    });
  }

  async getTotalFeesCollected(poolId: number): Promise<{
    totalAmount0: string;
    totalAmount1: string;
    collectCount: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('collect')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(CAST(collect.amount0 as DECIMAL))', 'totalAmount0')
      .addSelect('SUM(CAST(collect.amount1 as DECIMAL))', 'totalAmount1')
      .where('collect.poolId = :poolId', { poolId })
      .getRawOne();

    return {
      collectCount: parseInt(result.count) || 0,
      totalAmount0: result.totalAmount0 || '0',
      totalAmount1: result.totalAmount1 || '0'
    };
  }
}