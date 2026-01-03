import { DataSource, Repository } from 'typeorm';
import { TokenApproval } from '../entity/token-approval.entity';

export class TokenApprovalRepository {
  private repository: Repository<TokenApproval>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(TokenApproval);
  }

  async save(approvalData: Partial<TokenApproval>): Promise<TokenApproval> {
    const approval = this.repository.create(approvalData);
    return await this.repository.save(approval);
  }

  async findByToken(tokenAddress: string, limit: number = 100): Promise<TokenApproval[]> {
    return await this.repository.find({
      where: { tokenAddress },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  async findByOwner(owner: string, limit: number = 100): Promise<TokenApproval[]> {
    return await this.repository.find({
      where: { owner },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  async findBySpender(spender: string, limit: number = 100): Promise<TokenApproval[]> {
    return await this.repository.find({
      where: { spender },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  async getCurrentApproval(tokenAddress: string, owner: string, spender: string): Promise<TokenApproval | null> {
    return await this.repository.findOne({
      where: { tokenAddress, owner, spender },
      order: { timestamp: 'DESC' }
    });
  }
}