import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia } from 'viem/chains'; // Import common chains
import { LiquidationBotConfig } from '../types';

// Load environment variables
config();

// Helper function to get required env variables
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Helper function to get optional env variables with default
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Parse chain configuration
export const chainConfig = {
  id: Number(getOptionalEnv('CHAIN_ID', '1')), // Default to Ethereum mainnet
  rpcUrl: getRequiredEnv('RPC_URL'),
};

// Get the corresponding chain object
function getChainFromId(chainId: number) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    default:
      // For custom or other chains, create a minimal chain object
      return {
        id: chainId,
        name: `Chain ${chainId}`,
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: [chainConfig.rpcUrl],
          },
          public: {
            http: [chainConfig.rpcUrl],
          },
        },
      };
  }
}

// Create the liquidator account
const privateKey = getRequiredEnv('LIQUIDATOR_PRIVATE_KEY');
const account = privateKeyToAccount(privateKey as `0x${string}`);

// Contract addresses
const contractAddresses = {
  lens: getRequiredEnv('LENS_CONTRACT_ADDRESS'),
  positionManager: getRequiredEnv('POSITION_MANAGER_ADDRESS'),
  factory: getRequiredEnv('FACTORY_ADDRESS'),
};

// Bot configuration
export const botConfig: LiquidationBotConfig = {
  chainConfig,
  contracts: contractAddresses,
  liquidator: {
    privateKey,
    address: account.address,
  },
  scanInterval: Number(getOptionalEnv('SCAN_INTERVAL_SECONDS', '60')),
  batchSize: Number(getOptionalEnv('BATCH_SIZE', '10')),
  gasLimit: BigInt(getOptionalEnv('GAS_LIMIT', '1000000')),
  maxGasPriceGwei: Number(getOptionalEnv('MAX_GAS_PRICE_GWEI', '300')),
  minProfitUsd: BigInt(getOptionalEnv('MIN_PROFIT_USD', '5')) * BigInt(10 ** 18), // Convert to wei (18 decimals)
};

// Get the chain object for our chain ID
const chain = getChainFromId(chainConfig.id);

// Create a public client for reading from the blockchain
export const publicClient = createPublicClient({
  chain,
  transport: http(chainConfig.rpcUrl),
});

// Create a wallet client for sending transactions
export const walletClient = createWalletClient({
  account,
  chain,
  transport: http(chainConfig.rpcUrl),
});

export default botConfig;
