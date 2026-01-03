import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from './config';
import { Play } from './entity/play.entity';
import { Pool } from './entity/pool.entity';
import { LiquidityEvent } from './entity/liquidity-event.entity';
import { CollectEvent } from './entity/collect-event.entity';
import { TokenTransfer } from './entity/token-transfer.entity';
import { TokenApproval } from './entity/token-approval.entity';
import { Position } from './entity/position.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  url: config.dbURI,
  entities: [
    Play,
    Pool,
    LiquidityEvent,
    CollectEvent,
    TokenTransfer,
    TokenApproval,
    Position
  ],
  migrations: [__dirname + '/migration/**/*{.ts,.js}'],
  migrationsRun: false,
  synchronize: true,
  logging: false,
  supportBigNumbers: true,
  logger: 'simple-console',
};

export const AppDataSource = new DataSource(dataSourceOptions);
