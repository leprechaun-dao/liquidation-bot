import monitor from './monitor';
import logger from './utils/logger';
import { botConfig } from './utils/config';

/**
 * Main entry point for the liquidation bot
 */
async function main() {
  try {
    // Print startup banner
    console.log('\n' + '='.repeat(80));
    console.log(' Leprechaun Protocol Liquidation Bot '.padStart(50, '=').padEnd(80, '='));
    console.log('='.repeat(80) + '\n');
    
    // Log configuration
    logger.info(`Starting liquidation bot on chain ID: ${botConfig.chainConfig.id}`);
    logger.info(`Liquidator address: ${botConfig.liquidator.address}`);
    logger.info(`Lens contract: ${botConfig.contracts.lens}`);
    logger.info(`Position Manager contract: ${botConfig.contracts.positionManager}`);
    
    // Start the monitor
    monitor.start();
    
    // Run an initial scan immediately
    await monitor.scanAndLiquidate();
    
    // Set up process handlers for graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error(`Error starting liquidation bot: ${error}`);
    process.exit(1);
  }
}

/**
 * Graceful shutdown function
 */
function shutdown() {
  logger.info('Received shutdown signal');
  
  // Stop the monitor
  monitor.stop();
  
  // Log final statistics
  const stats = monitor.getStats();
  logger.info(`Shutting down with the following statistics:`);
  logger.info(`Total liquidations attempted: ${stats.totalLiquidations}`);
  logger.info(`Successful liquidations: ${stats.successfulLiquidations}`);
  logger.info(`Total profit: ${stats.totalProfitUsd}`);
  
  logger.info('Liquidation bot shutdown complete');
  process.exit(0);
}

// Execute main function
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Unhandled error in main: ${error}`);
    process.exit(1);
  });
}

export { main, shutdown };
