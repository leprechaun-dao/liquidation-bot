"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidationScanner = void 0;
const config_1 = require("./utils/config");
const abi_1 = require("./abi");
const logger_1 = __importStar(require("./utils/logger"));
const tokens_1 = require("./utils/tokens");
class LiquidationScanner {
    constructor(lensAddress = config_1.botConfig.contracts.lens, positionManagerAddress = config_1.botConfig.contracts.positionManager) {
        this.lensAddress = lensAddress;
        this.positionManagerAddress = positionManagerAddress;
    }
    /**
     * Fetches all liquidatable positions from the Lens contract
     */
    async getLiquidatablePositions(skip = 0, limit = config_1.botConfig.batchSize) {
        try {
            logger_1.default.info(`Fetching liquidatable positions (skip: ${skip}, limit: ${limit})...`);
            const result = await config_1.publicClient.readContract({
                address: this.lensAddress,
                abi: abi_1.LensABI,
                functionName: 'getLiquidatablePositions',
                args: [BigInt(skip), BigInt(limit)],
            });
            // // Debug log the raw result
            // logger.debug(`Raw contract response: ${JSON.stringify(result, (key, value) =>
            //   typeof value === 'bigint' ? value.toString() : value
            // )}`);
            // The contract returns an array with [positions, total]
            const [positions, total] = result;
            // // Debug log the destructured values
            // logger.debug(`Destructured positions: ${JSON.stringify(positions, (key, value) =>
            //   typeof value === 'bigint' ? value.toString() : value
            // )}`);
            logger_1.default.debug(`Destructured total: ${total}`);
            logger_1.default.info(`Found ${positions.length} liquidatable positions (total: ${total})`);
            return { positions, total };
        }
        catch (error) {
            logger_1.default.error(`Error fetching liquidatable positions: ${error}`);
            throw error;
        }
    }
    /**
     * Calculates the potential returns from liquidating a position
     */
    async calculateLiquidationReturns(positionId) {
        try {
            logger_1.default.debug(`Calculating liquidation returns for position ${positionId}...`);
            const result = await config_1.publicClient.readContract({
                address: this.lensAddress,
                abi: abi_1.LensABI,
                functionName: 'calculateLiquidationReturns',
                args: [positionId],
            });
            // Debug log the raw result
            logger_1.default.debug(`Raw liquidation returns: ${JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value)}`);
            // The contract returns an array with [syntheticAmount, collateralReceived, discount, fee]
            const [syntheticAmount, collateralReceived, discount, fee] = result;
            // Convert discount to percentage for logging
            const discountPercentage = Number(discount) / 100;
            logger_1.default.debug(`Synthetic Amount: ${syntheticAmount.toString()}`);
            logger_1.default.debug(`Collateral Received: ${collateralReceived.toString()}`);
            logger_1.default.debug(`Discount: ${discountPercentage}%`);
            logger_1.default.debug(`Fee: ${fee.toString()}`);
            return { syntheticAmount, collateralReceived, discount, fee };
        }
        catch (error) {
            logger_1.default.error(`Error calculating liquidation returns for position ${positionId}: ${error}`);
            throw error;
        }
    }
    /**
     * Gets detailed information about a specific position
     */
    async getPosition(positionId) {
        try {
            logger_1.default.debug(`Fetching details for position ${positionId}...`);
            const position = await config_1.publicClient.readContract({
                address: this.lensAddress,
                abi: abi_1.LensABI,
                functionName: 'getPosition',
                args: [positionId],
            });
            (0, logger_1.logPositionDetails)(position);
            return position;
        }
        catch (error) {
            logger_1.default.error(`Error fetching position ${positionId}: ${error}`);
            throw error;
        }
    }
    /**
     * Checks if a position is under-collateralized (can be liquidated)
     */
    async isPositionLiquidatable(positionId) {
        try {
            logger_1.default.debug(`Checking if position ${positionId} is liquidatable...`);
            const isUnderCollateralized = await config_1.publicClient.readContract({
                address: this.positionManagerAddress,
                abi: abi_1.PositionManagerABI,
                functionName: 'isUnderCollateralized',
                args: [positionId],
            });
            logger_1.default.debug(`Position ${positionId} is${isUnderCollateralized ? '' : ' not'} liquidatable`);
            return isUnderCollateralized;
        }
        catch (error) {
            logger_1.default.error(`Error checking if position ${positionId} is liquidatable: ${error}`);
            throw error;
        }
    }
    /**
     * Evaluates whether a liquidation would be profitable
     */
    async assessLiquidationProfitability(positionId) {
        try {
            logger_1.default.info(`Assessing profitability of liquidating position ${positionId}...`);
            // Get position details
            const position = await this.getPosition(positionId);
            // Verify position is liquidatable
            const isLiquidatable = await this.isPositionLiquidatable(positionId);
            if (!isLiquidatable) {
                return {
                    positionId,
                    isLiquidatable: false,
                    syntheticAsset: position.syntheticAsset,
                    syntheticSymbol: position.syntheticSymbol,
                    collateralAsset: position.collateralAsset,
                    collateralSymbol: position.collateralSymbol,
                    debtToPay: BigInt(0),
                    collateralToReceive: BigInt(0),
                    collateralValueUsd: BigInt(0),
                    debtValueUsd: BigInt(0),
                    estimatedProfitUsd: BigInt(0),
                    isProfitable: false,
                    liquidationDiscount: BigInt(0),
                    currentRatio: position.currentRatio,
                    requiredRatio: position.requiredRatio,
                };
            }
            // Calculate liquidation returns
            const { syntheticAmount, collateralReceived, discount } = await this.calculateLiquidationReturns(positionId);
            // If no synthetic amount to repay or no collateral to receive, liquidation is not profitable
            if (syntheticAmount === BigInt(0) || collateralReceived === BigInt(0)) {
                return {
                    positionId,
                    isLiquidatable: true,
                    syntheticAsset: position.syntheticAsset,
                    syntheticSymbol: position.syntheticSymbol,
                    collateralAsset: position.collateralAsset,
                    collateralSymbol: position.collateralSymbol,
                    debtToPay: syntheticAmount,
                    collateralToReceive: collateralReceived,
                    collateralValueUsd: BigInt(0),
                    debtValueUsd: BigInt(0),
                    estimatedProfitUsd: BigInt(0),
                    isProfitable: false,
                    liquidationDiscount: discount,
                    currentRatio: position.currentRatio,
                    requiredRatio: position.requiredRatio,
                };
            }
            // Use the USD values from the position details
            const debtValueUsd = position.debtUsdValue;
            // Calculate the value of the collateral to be received
            // We use the ratio of collateralReceived to the total collateral in the position
            // to calculate the portion of the USD value
            const collateralValueUsd = (position.collateralUsdValue * collateralReceived) / position.collateralAmount;
            // Calculate estimated profit (including the liquidation discount)
            const estimatedProfitUsd = collateralValueUsd - debtValueUsd;
            // Check if the profit meets the minimum threshold
            const isProfitable = estimatedProfitUsd >= config_1.botConfig.minProfitUsd;
            const result = {
                positionId,
                isLiquidatable: true,
                syntheticAsset: position.syntheticAsset,
                syntheticSymbol: position.syntheticSymbol,
                collateralAsset: position.collateralAsset,
                collateralSymbol: position.collateralSymbol,
                debtToPay: syntheticAmount,
                collateralToReceive: collateralReceived,
                collateralValueUsd,
                debtValueUsd,
                estimatedProfitUsd,
                isProfitable,
                liquidationDiscount: discount,
                currentRatio: position.currentRatio,
                requiredRatio: position.requiredRatio,
            };
            (0, logger_1.logProfitability)(result);
            if (isProfitable) {
                logger_1.default.info(`Position ${positionId} is profitable to liquidate with estimated profit of ${(0, tokens_1.formatUsdValue)(estimatedProfitUsd)}`);
            }
            else {
                logger_1.default.info(`Position ${positionId} is not profitable to liquidate with estimated profit of ${(0, tokens_1.formatUsdValue)(estimatedProfitUsd)} (min: ${(0, tokens_1.formatUsdValue)(config_1.botConfig.minProfitUsd)})`);
            }
            return result;
        }
        catch (error) {
            logger_1.default.error(`Error assessing profitability of liquidating position ${positionId}: ${error}`);
            throw error;
        }
    }
    /**
     * Scans for profitable liquidation opportunities
     */
    async scanForProfitableLiquidations(skip = 0, limit = config_1.botConfig.batchSize) {
        try {
            // Get liquidatable positions
            const { positions, total } = await this.getLiquidatablePositions(skip, limit);
            if (positions.length === 0) {
                logger_1.default.info('No liquidatable positions found');
                return [];
            }
            // Assess profitability of each position
            const assessments = await Promise.all(positions.map(position => this.assessLiquidationProfitability(position.positionId)));
            // Filter out positions that are not profitable
            const profitableLiquidations = assessments.filter((assessment) => assessment.isProfitable);
            logger_1.default.info(`Found ${profitableLiquidations.length} profitable liquidation opportunities out of ${positions.length} liquidatable positions`);
            // Sort by profit in descending order
            return profitableLiquidations.sort((a, b) => {
                return Number(b.estimatedProfitUsd - a.estimatedProfitUsd);
            });
        }
        catch (error) {
            logger_1.default.error(`Error scanning for profitable liquidations: ${error}`);
            throw error;
        }
    }
}
exports.LiquidationScanner = LiquidationScanner;
exports.default = new LiquidationScanner();
