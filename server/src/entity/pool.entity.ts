import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('pools')
@Index(['token0', 'token1', 'fee'], { unique: true })
export class Pool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  token0: string;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  token1: string;

  @Column({ type: 'int' })
  fee: number;

  @Column({ type: 'int' })
  tickSpacing: number;

  @Column({ type: 'varchar', length: 64 })
  poolAddress: string;

  @Column({ type: 'varchar', length: 78, nullable: true })
  sqrtPriceX96: string;

  @Column({ type: 'int', nullable: true })
  tick: number;

  @Column({ type: 'boolean', default: false })
  initialized: boolean;

  @Column({ type: 'varchar', length: 64 })
  deployHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}