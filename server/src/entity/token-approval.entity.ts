import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('token_approvals')
export class TokenApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  tokenAddress: string;

  @Column({ type: 'varchar', length: 80 })
  @Index()
  owner: string;

  @Column({ type: 'varchar', length: 80 })
  @Index()
  spender: string;

  @Column({ type: 'varchar', length: 78 })
  amount: string;

  @Column({ type: 'varchar', length: 64 })
  deployHash: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}