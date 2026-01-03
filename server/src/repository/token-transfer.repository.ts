import { DataSource, Repository } from 'typeorm';
import { TokenTransfer } from '../entity/token-transfer.entity';

export class TokenTransferRepository {
  private repository: Repository<TokenTransfer>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(TokenTransfer);
  }

  async save(transferData: Partial<TokenTransfer>): Promise<TokenTransfer> {
    const transfer = this.repository.create(transferData);
    return await this.repository.save(transfer);
  }

  async findByToken(tokenAddress: string, limit: number = 100): Promise<TokenTransfer[]> {
    return await this.repository.find({
      where: { tokenAddress },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  async findByAddress(address: string, limit: number = 100): Promise<TokenTransfer[]> {
    return await this.repository.find({
      where: [
        { from: address },
        { to: address }
      ],
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  async getTokenVolume(tokenAddress: string, hours: number = 24): Promise<{
    transferCount: number;
    totalVolume: string;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const result = await this.repository
      .createQueryBuilder('transfer')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(CAST(transfer.amount as DECIMAL))', 'volume')
      .where('transfer.tokenAddress = :tokenAddress', { tokenAddress })
      .andWhere('transfer.timestamp >= :since', { since })
      .getRawOne();

    return {
      transferCount: parseInt(result.count) || 0,
      totalVolume: result.volume || '0'
    };
  }

  async findMints(tokenAddress: string, limit: number = 100): Promise<TokenTransfer[]> {
    return await this.repository.find({
      where: { 
        tokenAddress,
        from: null // Mint events have null 'from' address
      },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }
}