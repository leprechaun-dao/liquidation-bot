import { publicClient, botConfig } from '../utils/config';
import { LensABI, PositionManagerABI } from '../abi';
import { PositionDetails, LiquidationReturns, ProfitabilityAssessment } from '../types';
import logger, { logPositionDetails, logLiquidationReturns, logProfitability } from '../utils/logger';
import { formatUsdValue } from '../utils/tokens';

export class LiquidationScanner {
  private lensAddress: string;
  private positionManagerAddress: string;

  constructor(
    lensAddress: string = botConfig.contracts.lens,
    positionManagerAddress: string = botConfig.contracts.positionManager
  ) {
    this.lensAddress = lensAddress;
    this.positionManagerAddress = positionManagerAddress;
  }

  /**
   * Fetches all liquidatable positions from the Lens contract
   */
  async getLiquidatablePositions(skip: number = 0, limit: number = botConfig.batchSize): Promise<{
    positions: PositionDetails[];
    total: bigint;
  }> {
    try {
      logger.info(`Fetching liquidatable positions (skip: ${skip}, limit: ${limit})...`);
      
      const result = await publicClient.readContract({
        address: this.lensAddress as `0x${string}`,
        abi: LensABI,
        functionName: 'getLiquidatablePositions',
        args: [BigInt(skip), BigInt(limit)],
      });
      
      const { positions, total } = result as { positions: PositionDetails[]; total: bigint };
      
      logger.info(`Found ${positions.length} liquidatable positions (total: ${total})`);
      
      return { positions, total };
    } catch (error) {
      logger.error(`Error fetching liquidatable positions: ${error}`);
      throw error;
    }
  }

  /**
   * Calculates the potential returns from liquidating a position
   */
  async calculateLiquidationReturns(positionId: bigint): Promise<LiquidationReturns> {
    try {
      logger.debug(`Calculating liquidation returns for position ${positionId}...`);
      
      const result = await publicClient.readContract({
        address: this.lensAddress as `0x${string}`,
        abi: LensABI,
        functionName: 'calculateLiquidationReturns',
        args: [positionId],
      });
      
      const { syntheticAmount, collateralReceived, discount, fee } = result as LiquidationReturns;
      
      logLiquidationReturns({ syntheticAmount, collateralReceived, discount, fee });
      
      return { syntheticAmount, collateralReceived, discount, fee };
    } catch (error) {
      logger.error(`Error calculating liquidation returns for position ${positionId}: ${error}`);
      throw error;
    }
  }

  /**
   * Gets detailed information about a specific position
   */
  async getPosition(positionId: bigint): Promise<PositionDetails> {
    try {
      logger.debug(`Fetching details for position ${positionId}...`);
      
      const position = await publicClient.readContract({
        address: this.lensAddress as `0x${string}`,
        abi: LensABI,
        functionName: 'getPosition',
        args: [positionId],
      });
      
      logPositionDetails(position as PositionDetails);
      
      return position as PositionDetails;
    } catch (error) {
      logger.error(`Error fetching position ${positionId}: ${error}`);
      throw error;
    }
  }

  /**
   * Checks if a position is under-collateralized (can be liquidated)
   */
  async isPositionLiquidatable(positionId: bigint): Promise<boolean> {
    try {
      logger.debug(`Checking if position ${positionId} is liquidatable...`);
      
      const isUnderCollateralized = await publicClient.readContract({
        address: this.positionManagerAddress as `0x${string}`,
        abi: PositionManagerABI,
        functionName: 'isUnderCollateralized',
        args: [positionId],
      });
      
      logger.debug(`Position ${positionId} is${isUnderCollateralized ? '' : ' not'} liquidatable`);
      
      return isUnderCollateralized as boolean;
    } catch (error) {
      logger.error(`Error checking if position ${positionId} is liquidatable: ${error}`);
      throw error;
    }
  }

  /**
   * Evaluates whether a liquidation would be profitable
   */
  async assessLiquidationProfitability(positionId: bigint): Promise<ProfitabilityAssessment> {
    try {
      logger.info(`Assessing profitability of liquidating position ${positionId}...`);
      
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
      const collateralValueUsd = position.collateralUsdValue * collateralReceived / position.collateralAmount;
      
      // Calculate estimated profit (including the liquidation discount)
      const estimatedProfitUsd = collateralValueUsd - debtValueUsd;
      
      // Check if the profit meets the minimum threshold
      const isProfitable = estimatedProfitUsd >= botConfig.minProfitUsd;
      
      const result: ProfitabilityAssessment = {
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
      
      logProfitability(result);
      
      if (isProfitable) {
        logger.info(`Position ${positionId} is profitable to liquidate with estimated profit of ${formatUsdValue(estimatedProfitUsd)}`);
      } else {
        logger.info(`Position ${positionId} is not profitable to liquidate with estimated profit of ${formatUsdValue(estimatedProfitUsd)} (min: ${formatUsdValue(botConfig.minProfitUsd)})`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error assessing profitability of liquidating position ${positionId}: ${error}`);
      throw error;
    }
  }

  /**
   * Scans for profitable liquidation opportunities
   */
  async scanForProfitableLiquidations(
    skip: number = 0,
    limit: number = botConfig.batchSize
  ): Promise<ProfitabilityAssessment[]> {
    try {
      // Get liquidatable positions
      const { positions, total } = await this.getLiquidatablePositions(skip, limit);
      
      if (positions.length === 0) {
        logger.info('No liquidatable positions found');
        return [];
      }
      
      // Assess profitability of each position
      const assessments = await Promise.all(
        positions.map(position => this.assessLiquidationProfitability(position.positionId))
      );
      
      // Filter out positions that are not profitable
      const profitableLiquidations = assessments.filter(assessment => assessment.isProfitable);
      
      logger.info(`Found ${profitableLiquidations.length} profitable liquidation opportunities out of ${positions.length} liquidatable positions`);
      
      // Sort by profit in descending order
      return profitableLiquidations.sort((a, b) => {
        return Number(b.estimatedProfitUsd - a.estimatedProfitUsd);
      });
    } catch (error) {
      logger.error(`Error scanning for profitable liquidations: ${error}`);
      throw error;
    }
  }
}

export default new LiquidationScanner();
