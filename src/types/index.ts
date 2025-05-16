// Chain configuration
export interface ChainConfig {
  id: number;
  rpcUrl: string;
}

// Position details from the Lens contract
export interface PositionDetails {
  positionId: bigint;
  owner: string;
  syntheticAsset: string;
  syntheticSymbol: string;
  collateralAsset: string;
  collateralSymbol: string;
  collateralAmount: bigint;
  mintedAmount: bigint;
  lastUpdateTimestamp: bigint;
  isActive: boolean;
  currentRatio: bigint;
  requiredRatio: bigint;
  isUnderCollateralized: boolean;
  collateralUsdValue: bigint;
  debtUsdValue: bigint;
}

// Liquidation returns calculation
export interface LiquidationReturns {
  syntheticAmount: bigint;
  collateralReceived: bigint;
  discount: bigint;
  fee: bigint;
}

// A profitability assessment for a liquidation
export interface ProfitabilityAssessment {
  positionId: bigint;
  isLiquidatable: boolean;
  syntheticAsset: string;
  syntheticSymbol: string;
  collateralAsset: string;
  collateralSymbol: string;
  debtToPay: bigint;
  collateralToReceive: bigint;
  collateralValueUsd: bigint;
  debtValueUsd: bigint;
  estimatedProfitUsd: bigint;
  isProfitable: boolean;
  liquidationDiscount: bigint;
  currentRatio: bigint;
  requiredRatio: bigint;
}

// Gas estimation for a transaction
export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCostWei: bigint;
  estimatedCostEth: string;
}

// Transaction receipt with additional context
export interface EnhancedTransactionReceipt {
  transactionHash: string;
  blockNumber: bigint;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  totalCostWei: bigint;
  totalCostEth: string;
  status: 'success' | 'failure';
}

// Liquidation result
export interface LiquidationResult {
  positionId: bigint;
  transactionHash: string;
  status: 'success' | 'failure';
  error?: string;
  receipt?: EnhancedTransactionReceipt;
  collateralReceived?: bigint;
  profitUsd?: bigint;
}

// Configuration for the liquidation bot
export interface LiquidationBotConfig {
  chainConfig: ChainConfig;
  contracts: {
    lens: string;
    positionManager: string;
    factory: string;
  };
  liquidator: {
    privateKey: string;
    address: string;
  };
  scanInterval: number; // in seconds
  batchSize: number;
  gasLimit: bigint;
  maxGasPriceGwei: number;
  minProfitUsd: bigint;
}
