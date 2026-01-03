import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Pool } from './pool.entity';

@Entity('liquidity_events')
export class LiquidityEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  @Index()
  eventType: 'mint' | 'burn';

  @Column({ type: 'int' })
  @Index()
  poolId: number;

  @ManyToOne(() => Pool)
  @JoinColumn({ name: 'poolId' })
  pool: Pool;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  sender: string;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  owner: string;

  @Column({ type: 'int' })
  tickLower: number;

  @Column({ type: 'int' })
  tickUpper: number;

  @Column({ type: 'varchar', length: 39 })
  amount: string;

  @Column({ type: 'varchar', length: 78 })
  amount0: string;

  @Column({ type: 'varchar', length: 78 })
  amount1: string;

  @Column({ type: 'varchar', length: 64 })
  deployHash: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}