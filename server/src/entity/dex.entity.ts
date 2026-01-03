import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('dex_pools')
@Index(['token0', 'token1', 'fee'], { unique: true })
export class Pool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 68 })
  pool_id: string; // [u8; 32] as hex

  @Column({ type: 'varchar', length: 68 })
  token0: string;

  @Column({ type: 'varchar', length: 68 })
  token1: string;

  @Column({ type: 'integer' })
  fee: number;

  @Column({ type: 'integer' })
  tick_spacing: number;

  @Column({ type: 'varchar', length: 78 })
  sqrt_price_x96: string; // U256 as string

  @Column({ type: 'integer' })
  tick: number;

  @Column({ type: 'varchar', length: 39 })
  liquidity: string; // U128 as string

  @Column({ type: 'boolean', default: false })
  initialized: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('dex_positions')
@Index(['owner', 'pool_id', 'tick_lower', 'tick_upper'], { unique: true })
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 68 })
  pool_id: string;

  @Column({ type: 'varchar', length: 68 })
  owner: string;

  @Column({ type: 'integer' })
  tick_lower: number;

  @Column({ type: 'integer' })
  tick_upper: number;

  @Column({ type: 'varchar', length: 39 })
  liquidity: string; // U128

  @Column({ type: 'varchar', length: 39 })
  tokens_owed_0: string; // U128

  @Column({ type: 'varchar', length: 39 })
  tokens_owed_1: string; // U128

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('dex_swaps')
@Index(['pool_id', 'block_timestamp'])
export class Swap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 68 })
  pool_id: string;

  @Column({ type: 'varchar', length: 68 })
  sender: string;

  @Column({ type: 'varchar', length: 68 })
  recipient: string;

  @Column({ type: 'varchar', length: 78 })
  amount0: string; // I128 as string

  @Column({ type: 'varchar', length: 78 })
  amount1: string; // I128 as string

  @Column({ type: 'varchar', length: 78 })
  sqrt_price_x96: string; // U256

  @Column({ type: 'integer' })
  tick: number;

  @Column({ type: 'varchar', length: 68 })
  deploy_hash: string;

  @Column({ type: 'timestamp' })
  block_timestamp: Date;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('dex_liquidity_events')
@Index(['pool_id', 'block_timestamp'])
export class LiquidityEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 68 })
  pool_id: string;

  @Column({ type: 'enum', enum: ['mint', 'burn', 'collect'] })
  event_type: 'mint' | 'burn' | 'collect';

  @Column({ type: 'varchar', length: 68 })
  owner: string;

  @Column({ type: 'varchar', length: 68, nullable: true })
  recipient: string;

  @Column({ type: 'integer' })
  tick_lower: number;

  @Column({ type: 'integer' })
  tick_upper: number;

  @Column({ type: 'varchar', length: 39 })
  amount: string; // U128

  @Column({ type: 'varchar', length: 78 })
  amount0: string; // U256

  @Column({ type: 'varchar', length: 78 })
  amount1: string; // U256

  @Column({ type: 'varchar', length: 68 })
  deploy_hash: string;

  @Column({ type: 'timestamp' })
  block_timestamp: Date;

  @CreateDateColumn()
  created_at: Date;
}