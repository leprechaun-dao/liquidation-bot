"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletClient = exports.publicClient = exports.botConfig = exports.chainConfig = void 0;
const dotenv_1 = require("dotenv");
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains"); // Import common chains
// Load environment variables
(0, dotenv_1.config)();
// Helper function to get required env variables
function getRequiredEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}
// Helper function to get optional env variables with default
function getOptionalEnv(key, defaultValue) {
    return process.env[key] || defaultValue;
}
// Parse chain configuration
exports.chainConfig = {
    id: Number(getOptionalEnv('CHAIN_ID', '1')), // Default to Ethereum mainnet
    rpcUrl: getRequiredEnv('RPC_URL'),
};
// Get the corresponding chain object
function getChainFromId(chainId) {
    switch (chainId) {
        case 1:
            return chains_1.mainnet;
        case 11155111:
            return chains_1.sepolia;
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
                        http: [exports.chainConfig.rpcUrl],
                    },
                    public: {
                        http: [exports.chainConfig.rpcUrl],
                    },
                },
            };
    }
}
// Create the liquidator account
const privateKey = getRequiredEnv('LIQUIDATOR_PRIVATE_KEY');
const account = (0, accounts_1.privateKeyToAccount)(privateKey);
// Contract addresses
const contractAddresses = {
    lens: getRequiredEnv('LENS_CONTRACT_ADDRESS'),
    positionManager: getRequiredEnv('POSITION_MANAGER_ADDRESS'),
    factory: getRequiredEnv('FACTORY_ADDRESS'),
};
// Bot configuration
exports.botConfig = {
    chainConfig: exports.chainConfig,
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
const chain = getChainFromId(exports.chainConfig.id);
// Create a public client for reading from the blockchain
exports.publicClient = (0, viem_1.createPublicClient)({
    chain,
    transport: (0, viem_1.http)(exports.chainConfig.rpcUrl),
});
// Create a wallet client for sending transactions
exports.walletClient = (0, viem_1.createWalletClient)({
    account,
    chain,
    transport: (0, viem_1.http)(exports.chainConfig.rpcUrl),
});
exports.default = exports.botConfig;
