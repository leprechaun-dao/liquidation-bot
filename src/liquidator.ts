import { publicClient, walletClient, botConfig } from './utils/config';
import { LiquidationScanner } from './scanner';
import { PositionManagerABI, ERC20ABI } from './abi';
import { ProfitabilityAssessment, LiquidationResult, EnhancedTransactionReceipt } from './types';
import logger from './utils/logger';
import { 
  getTokenAllowance, 
  getTokenBalance, 
  formatTokenAmount, 
  formatUsdValue 
} from './utils/tokens';
import { 
  estimateGasCost, 
  isGasPriceAcceptable, 
  waitForReceipt, 
  enhanceTransactionReceipt 
} from './utils/blockchain';

export class LiquidationExecutor {
  private scanner: LiquidationScanner;
  private positionManagerAddress: string;

  constructor(
    positionManagerAddress: string = botConfig.contracts.positionManager,
    scanner: LiquidationScanner = new LiquidationScanner()
  ) {
    this.positionManagerAddress = positionManagerAddress;
    this.scanner = scanner;
  }

  /**
   * Checks and approves token allowance if needed
   */
  async checkAndApproveTokenAllowance(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ): Promise<boolean> {
    try {
      const owner = botConfig.liquidator.address;
      
      // Check current allowance
      const currentAllowance = await getTokenAllowance(tokenAddress, owner, spenderAddress);
      
      // If current allowance is sufficient, return true
      if (currentAllowance >= amount) {
        logger.debug(`Current allowance (${currentAllowance}) is sufficient for ${amount}`);
        return true;
      }
      
      // If current allowance is insufficient, approve the token
      logger.info(`Approving ${await formatTokenAmount(tokenAddress, amount)} for ${spenderAddress}`);
      
      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        account: walletClient.account,
        address: tokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [spenderAddress, amount],
      });
      
      // Check gas price is acceptable
      if (!(await isGasPriceAcceptable())) {
        logger.warn('Gas price is too high, skipping approval');
        return false;
      }
      
      // Execute the transaction
      const txHash = await walletClient.writeContract(request);
      
      logger.info(`Approval transaction sent: ${txHash}`);
      
      // Wait for the transaction to be mined
      const receipt = await waitForReceipt(txHash);
      const enhancedReceipt = enhanceTransactionReceipt(receipt);
      
      if (enhancedReceipt.status === 'success') {
        logger.info(`Approval successful, gas used: ${enhancedReceipt.gasUsed}, cost: ${enhancedReceipt.totalCostEth} ETH`);
        return true;
      } else {
        logger.error(`Approval failed`);
        return false;
      }
    } catch (error) {
      logger.error(`Error approving token: ${error}`);
      return false;
    }
  }

  /**
   * Checks if the liquidator has sufficient balance to execute a liquidation
   */
  async checkLiquidatorBalance(
    tokenAddress: string,
    requiredAmount: bigint
  ): Promise<boolean> {
    try {
      const balance = await getTokenBalance(tokenAddress, botConfig.liquidator.address);
      
      logger.debug(`Liquidator balance: ${await formatTokenAmount(tokenAddress, balance)}, required: ${await formatTokenAmount(tokenAddress, requiredAmount)}`);
      
      return balance >= requiredAmount;
    } catch (error) {
      logger.error(`Error checking liquidator balance: ${error}`);
      return false;
    }
  }

  /**
   * Executes a liquidation for a position
   */
  async executeLiquidation(positionId: bigint): Promise<LiquidationResult> {
    try {
      logger.info(`Executing liquidation for position ${positionId}...`);
      
      // Verify position is still liquidatable
      const isLiquidatable = await this.scanner.isPositionLiquidatable(positionId);
      
      if (!isLiquidatable) {
        logger.warn(`Position ${positionId} is no longer liquidatable`);
        return {
          positionId,
          transactionHash: '',
          status: 'failure',
          error: 'Position is no longer liquidatable',
        };
      }
      
      // Get liquidation details
      const assessment = await this.scanner.assessLiquidationProfitability(positionId);
      
      if (!assessment.isLiquidatable || !assessment.isProfitable) {
        logger.warn(`Position ${positionId} is not profitable to liquidate`);
        return {
          positionId,
          transactionHash: '',
          status: 'failure',
          error: 'Position is not profitable to liquidate',
        };
      }
      
      // Check if liquidator has sufficient balance of the synthetic asset
      const hasSufficientBalance = await this.checkLiquidatorBalance(
        assessment.syntheticAsset,
        assessment.debtToPay
      );
      
      if (!hasSufficientBalance) {
        logger.error(`Insufficient balance to liquidate position ${positionId}`);
        return {
          positionId,
          transactionHash: '',
          status: 'failure',
          error: 'Insufficient balance',
        };
      }
      
      // Approve the position manager to spend the synthetic asset
      const isApproved = await this.checkAndApproveTokenAllowance(
        assessment.syntheticAsset,
        this.positionManagerAddress,
        assessment.debtToPay
      );
      
      if (!isApproved) {
        logger.error(`Failed to approve position manager to spend synthetic asset`);
        return {
          positionId,
          transactionHash: '',
          status: 'failure',
          error: 'Failed to approve position manager',
        };
      }
      
      // Prepare the liquidation transaction
      const { request } = await publicClient.simulateContract({
        account: walletClient.account,
        address: this.positionManagerAddress as `0x${string}`,
        abi: PositionManagerABI,
        functionName: 'liquidate',
        args: [positionId],
      });
      
      // Check gas price is acceptable
      if (!(await isGasPriceAcceptable())) {
        logger.warn('Gas price is too high, skipping liquidation');
        return {
          positionId,
          transactionHash: '',
          status: 'failure',
          error: 'Gas price too high',
        };
      }
      
      // Execute the liquidation
      const txHash = await walletClient.writeContract(request);
      
      logger.info(`Liquidation transaction sent: ${txHash}`);
      
      // Wait for the transaction to be mined
      const receipt = await waitForReceipt(txHash);
      const enhancedReceipt = enhanceTransactionReceipt(receipt);
      
      // Log the raw receipt status for debugging
      logger.debug(`Raw receipt status: ${receipt.status}`);
      logger.debug(`Enhanced receipt status: ${enhancedReceipt.status}`);
      
      // Check if the transaction was successful
      const isSuccessful = enhancedReceipt.status === 'success';
      
      if (isSuccessful) {
        logger.info(`Liquidation successful for position ${positionId}`);
        logger.info(`Gas used: ${enhancedReceipt.gasUsed}, cost: ${enhancedReceipt.totalCostEth} ETH`);
        logger.info(`Estimated profit: ${formatUsdValue(assessment.estimatedProfitUsd)}`);
        
        return {
          positionId,
          transactionHash: txHash,
          status: 'success',
          receipt: enhancedReceipt as EnhancedTransactionReceipt,
          collateralReceived: assessment.collateralToReceive,
          profitUsd: assessment.estimatedProfitUsd,
        };
      } else {
        logger.error(`Liquidation failed for position ${positionId}`);
        logger.error(`Transaction status: ${receipt.status}, Enhanced status: ${enhancedReceipt.status}`);
        
        return {
          positionId,
          transactionHash: txHash,
          status: 'failure',
          error: 'Transaction failed',
          receipt: enhancedReceipt as EnhancedTransactionReceipt,
        };
      }
    } catch (error) {
      logger.error(`Error executing liquidation for position ${positionId}: ${error}`);
      
      return {
        positionId,
        transactionHash: '',
        status: 'failure',
        error: `${error}`,
      };
    }
  }

  /**
   * Scans for profitable liquidations and executes them
   */
  async scanAndExecuteLiquidations(
    skip: number = 0,
    limit: number = botConfig.batchSize
  ): Promise<LiquidationResult[]> {
    try {
      logger.info('Scanning for profitable liquidations...');
      
      // Scan for profitable liquidations
      const profitableLiquidations = await this.scanner.scanForProfitableLiquidations(skip, limit);
      
      if (profitableLiquidations.length === 0) {
        logger.info('No profitable liquidations found');
        return [];
      }
      
      logger.info(`Found ${profitableLiquidations.length} profitable liquidations`);
      
      // Execute each liquidation
      const results: LiquidationResult[] = [];
      
      for (const liquidation of profitableLiquidations) {
        logger.info(`Processing liquidation for position ${liquidation.positionId}...`);
        
        // Execute the liquidation
        const result = await this.executeLiquidation(liquidation.positionId);
        
        results.push(result);
        
        // If liquidation was successful, log the result
        if (result.status === 'success') {
          logger.info(`Successfully liquidated position ${liquidation.positionId}`);
          logger.info(`Collateral received: ${await formatTokenAmount(liquidation.collateralAsset, result.collateralReceived || BigInt(0))}`);
          logger.info(`Estimated profit: ${formatUsdValue(result.profitUsd || BigInt(0))}`);
        } else {
          logger.warn(`Failed to liquidate position ${liquidation.positionId}: ${result.error}`);
        }
        
        // Brief pause between liquidations to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      return results;
    } catch (error) {
      logger.error(`Error in scanAndExecuteLiquidations: ${error}`);
      throw error;
    }
  }
}

export default new LiquidationExecutor();
