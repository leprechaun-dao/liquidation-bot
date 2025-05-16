import cron from 'node-cron';
import liquidator from './liquidator';
import { botConfig } from './utils/config';
import logger from './utils/logger';
import { formatUsdValue } from './utils/tokens';

export class LiquidationMonitor {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private totalLiquidations: number = 0;
  private successfulLiquidations: number = 0;
  private totalProfitUsd: bigint = BigInt(0);

  /**
   * Starts the monitor with a scheduled task
   */
  start(): void {
    if (this.cronJob) {
      logger.warn('Monitor is already running');
      return;
    }

    const cronPattern = `*/${botConfig.scanInterval} * * * * *`; // Run every scanInterval seconds
    logger.info(`Starting liquidation monitor with pattern: ${cronPattern}`);

    this.cronJob = cron.schedule(cronPattern, async () => {
      await this.scanAndLiquidate();
    });

    logger.info('Liquidation monitor started');
    logger.info(`Scanning for liquidatable positions every ${botConfig.scanInterval} seconds`);
    logger.info(`Minimum profit threshold: ${formatUsdValue(botConfig.minProfitUsd)}`);
    logger.info(`Maximum gas price: ${botConfig.maxGasPriceGwei} Gwei`);
    logger.info(`Batch size: ${botConfig.batchSize} positions per scan`);
  }

  /**
   * Scans for and executes liquidations in a single run
   */
  async scanAndLiquidate(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Already scanning, skipping this run');
      return;
    }

    this.isRunning = true;

    try {
      logger.info('Scanning for liquidation opportunities...');
      
      const results = await liquidator.scanAndExecuteLiquidations(0, botConfig.batchSize);
      
      // Update statistics
      this.totalLiquidations += results.length;
      this.successfulLiquidations += results.filter(r => r.status === 'success').length;
      
      // Sum up profits
      const profitInThisRun = results.reduce((sum, r) => sum + (r.profitUsd || BigInt(0)), BigInt(0));
      this.totalProfitUsd += profitInThisRun;
      
      // Log statistics
      if (results.length > 0) {
        logger.info(`Liquidation run complete. ${results.filter(r => r.status === 'success').length}/${results.length} positions liquidated`);
        logger.info(`Profit in this run: ${formatUsdValue(profitInThisRun)}`);
        logger.info(`Total profit so far: ${formatUsdValue(this.totalProfitUsd)}`);
        logger.info(`Success rate: ${(this.successfulLiquidations / this.totalLiquidations * 100).toFixed(2)}%`);
      } else {
        logger.info('No liquidations executed in this run');
      }
    } catch (error) {
      logger.error(`Error in liquidation run: ${error}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stops the monitor
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Liquidation monitor stopped');
    } else {
      logger.warn('Monitor is not running');
    }
  }

  /**
   * Returns the current statistics
   */
  getStats(): {
    totalLiquidations: number;
    successfulLiquidations: number;
    totalProfitUsd: bigint;
    isRunning: boolean;
  } {
    return {
      totalLiquidations: this.totalLiquidations,
      successfulLiquidations: this.successfulLiquidations,
      totalProfitUsd: this.totalProfitUsd,
      isRunning: this.isRunning,
    };
  }
}

export default new LiquidationMonitor();
