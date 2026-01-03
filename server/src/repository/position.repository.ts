import { DataSource, Repository } from 'typeorm';
import { Position } from '../entity/position.entity';

export class PositionRepository {
  private repository: Repository<Position>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Position);
  }

  async save(positionData: Partial<Position>): Promise<Position> {
    const position = this.repository.create(positionData);
    return await this.repository.save(position);
  }

  async findByTokenId(tokenId: string): Promise<Position | null> {
    return await this.repository.findOne({
      where: { tokenId },
      relations: ['pool']
    });
  }

  async findByOwner(owner: string): Promise<Position[]> {
    return await this.repository.find({
      where: { owner },
      order: { createdAt: 'DESC' },
      relations: ['pool']
    });
  }

  async findByPool(poolId: number): Promise<Position[]> {
    return await this.repository.find({
      where: { poolId },
      order: { createdAt: 'DESC' },
      relations: ['pool']
    });
  }

  async updateLiquidity(tokenId: string, liquidity: string): Promise<void> {
    await this.repository.update({ tokenId }, { liquidity });
  }

  async getPositionStats(owner: string): Promise<{
    totalPositions: number;
    activePools: number;
    totalLiquidity: string;
  }> {
    const result = await this.repository
      .createQueryBuilder('position')
      .select('COUNT(*)', 'totalPositions')
      .addSelect('COUNT(DISTINCT position.poolId)', 'activePools')
      .addSelect('SUM(CAST(position.liquidity as DECIMAL))', 'totalLiquidity')
      .where('position.owner = :owner', { owner })
      .andWhere('CAST(position.liquidity as DECIMAL) > 0')
      .getRawOne();

    return {
      totalPositions: parseInt(result.totalPositions) || 0,
      activePools: parseInt(result.activePools) || 0,
      totalLiquidity: result.totalLiquidity || '0'
    };
  }
}