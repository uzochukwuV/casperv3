import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('token_transfers')
export class TokenTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  tokenAddress: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  @Index()
  from: string;

  @Column({ type: 'varchar', length: 80 })
  @Index()
  to: string;

  @Column({ type: 'varchar', length: 78 })
  amount: string;

  @Column({ type: 'varchar', length: 64 })
  deployHash: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}