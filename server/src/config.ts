import * as process from 'process';
import dotenv from 'dotenv';

dotenv.config();

interface Config {
  httpPort: number;
  csprCloudApiUrl: string;
  csprCloudStreamingUrl: string;
  csprCloudAccessKey: string;
  dbURI: string;
  dexContractPackageHash: string;
  routerContractPackageHash: string;
  positionManagerContractPackageHash: string;
  wcspr_token_contract_hash: string;
  usdt_token_contract_hash: string;
  cdai_token_contract_hash: string;
  tokens: {
    TCSPR: string;
    USDT: string;
    CDAI: string;
  };
}

export const config: Config = {
  httpPort: process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3001,
  csprCloudApiUrl: process.env.CSPR_CLOUD_URL || 'https://api.testnet.cspr.cloud',
  csprCloudStreamingUrl: process.env.CSPR_CLOUD_STREAMING_URL || 'wss://streaming.testnet.cspr.cloud',
  csprCloudAccessKey: process.env.CSPR_CLOUD_ACCESS_KEY || '019b7fed-bd51-7464-9b8f-5e1732b2f6fa',
  dbURI: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/lottery',
  dexContractPackageHash: process.env.DEX_CONTRACT_PACKAGE_HASH || '0cf0a2afcdfcbc9285290597914178d37f7089e8d909b518dc39adf2cb1552b6',
  routerContractPackageHash: process.env.ROUTER_CONTRACT_PACKAGE_HASH || 'ac46e37378e373a08435b6e4c38e335ba3b9e990707ba80ca900b2308d94d6fa',
  positionManagerContractPackageHash: process.env.POSITION_MANAGER_CONTRACT_PACKAGE_HASH || '091e7e7ae54f16d51067c5442c10ee9fee281a9516a5c89b2296993dd422731d',
  wcspr_token_contract_hash: process.env.TCSPR_TOKEN_HASH || '11e528cd01b3b40845e1353ea482fd4f46cab386e88801d53abdfdeb77100859',
  usdt_token_contract_hash: process.env.USDT_TOKEN_HASH || '4ad18d2ea1a622e22b9f4c3e4b90eca5708788853d9122113cf78b8a23282dc6',
  cdai_token_contract_hash: process.env.CDAI_TOKEN_HASH || '60233c0f979a59991a0a4813846dd2302727f4253911a5c87be6ed1e78196448',
  tokens: {
    TCSPR: process.env.TCSPR_TOKEN_HASH || '11e528cd01b3b40845e1353ea482fd4f46cab386e88801d53abdfdeb77100859',
    USDT: process.env.USDT_TOKEN_HASH || '4ad18d2ea1a622e22b9f4c3e4b90eca5708788853d9122113cf78b8a23282dc6',
    CDAI: process.env.CDAI_TOKEN_HASH || '60233c0f979a59991a0a4813846dd2302727f4253911a5c87be6ed1e78196448',
  },
};