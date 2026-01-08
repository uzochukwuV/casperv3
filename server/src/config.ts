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
  dexContractPackageHash: process.env.DEX_CONTRACT_PACKAGE_HASH || '50ded6d1d757169b24c204c3b61817924f9eec966d49b280f8fe50e3e5dc76ba',
  routerContractPackageHash: process.env.ROUTER_CONTRACT_PACKAGE_HASH || '7a4664ee6f73cc5225540dbc6432e1514e280661e00a16c17e81b4f7ff66641c',
  positionManagerContractPackageHash: process.env.POSITION_MANAGER_CONTRACT_PACKAGE_HASH || 'e373907513a94e9d8cf8f9f6cac23a36ee11845e8a0d5c68dbc75ab4006e50d9',
  wcspr_token_contract_hash: process.env.TCSPR_TOKEN_HASH || 'd038947f02171806e38d7ccf66d3aff5944cc423d085417adbabf3dc1b26c4b0',
  usdt_token_contract_hash: process.env.USDT_TOKEN_HASH || 'df57c51153d165dbea1c9dd220274eb6445fb9b3826c2e23aade3ccd5f0187bb',
  cdai_token_contract_hash: process.env.CDAI_TOKEN_HASH || '29f1f52b65c171703bb74d2887cf7a6dcec8d833192ff1b221c5e56d1aabd1e1',
  tokens: {
    TCSPR: process.env.TCSPR_TOKEN_HASH || 'd038947f02171806e38d7ccf66d3aff5944cc423d085417adbabf3dc1b26c4b0',
    USDT: process.env.USDT_TOKEN_HASH || 'df57c51153d165dbea1c9dd220274eb6445fb9b3826c2e23aade3ccd5f0187bb',
    CDAI: process.env.CDAI_TOKEN_HASH || '29f1f52b65c171703bb74d2887cf7a6dcec8d833192ff1b221c5e56d1aabd1e1',
  },
};