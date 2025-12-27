import * as process from 'process';

/**
 * DEX Contract Configuration
 *
 * Deployed contract addresses from deployment output:
 * Factory: contract-package-da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9
 * PositionManager: contract-package-2855cea2bcc53e5505820c988799db99f05deca7ebfda96dc20793d4d249838e
 */
export interface DexConfig {
  factoryPackageHash: string;
  positionManagerPackageHash: string;
  networkName: string;
  rpcUrl: string;
  deployerPrivateKeyPath?: string; // Path to PEM file for pool deployment
  gasLimits: {
    deployPool: string;
    initializePool: string;
    registerPool: string;
  };
}

export const dexConfig: DexConfig = {
  factoryPackageHash: process.env.FACTORY_CONTRACT_PACKAGE_HASH ||
    'da9f164fbabbccb396fb90ed30b66d20836e196f27075f5c6f3ce4529afe9bb9',

  positionManagerPackageHash: process.env.POSITION_MANAGER_CONTRACT_PACKAGE_HASH ||
    '2855cea2bcc53e5505820c988799db99f05deca7ebfda96dc20793d4d249838e',


  networkName: process.env.CASPER_NETWORK_NAME || 'casper-test',

  rpcUrl: process.env.CASPER_RPC_URL || "https://node.testnet.casper.network",

  deployerPrivateKeyPath: process.env.DEPLOYER_PRIVATE_KEY_PATH,

  gasLimits: {
    deployPool: process.env.DEPLOY_POOL_GAS || '500000000000', // 500 CSPR (matches lottery deployment)
    initializePool: process.env.INITIALIZE_POOL_GAS || '100000000000', // 100 CSPR
    registerPool: process.env.REGISTER_POOL_GAS || '50000000000', // 50 CSPR
  },
};

/**
 * Fee tiers with tick spacings
 */
export const FEE_TIERS = {
  LOW: { fee: 500, tickSpacing: 10, label: '0.05%' },
  MEDIUM: { fee: 3000, tickSpacing: 60, label: '0.3%' },
  HIGH: { fee: 10000, tickSpacing: 200, label: '1.0%' },
} as const;

export type FeeTier = typeof FEE_TIERS[keyof typeof FEE_TIERS];

export function getFeeTier(fee: number): FeeTier | undefined {
  return Object.values(FEE_TIERS).find(tier => tier.fee === fee);
}
