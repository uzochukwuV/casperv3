import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Pool } from './pool.entity';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  tokenId: string;

  @Column({ type: 'int' })
  @Index()
  poolId: number;

  @ManyToOne(() => Pool)
  @JoinColumn({ name: 'poolId' })
  pool: Pool;

  @Column({ type: 'varchar', length: 64 })
  @Index()
  owner: string;

  @Column({ type: 'int' })
  tickLower: number;

  @Column({ type: 'int' })
  tickUpper: number;

  @Column({ type: 'varchar', length: 39 })
  liquidity: string;

  @Column({ type: 'varchar', length: 64 })
  deployHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}