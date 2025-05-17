"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.shutdown = shutdown;
const monitor_1 = __importDefault(require("./monitor"));
const logger_1 = __importDefault(require("./utils/logger"));
const config_1 = require("./utils/config");
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
        logger_1.default.info(`Starting liquidation bot on chain ID: ${config_1.botConfig.chainConfig.id}`);
        logger_1.default.info(`Liquidator address: ${config_1.botConfig.liquidator.address}`);
        logger_1.default.info(`Lens contract: ${config_1.botConfig.contracts.lens}`);
        logger_1.default.info(`Position Manager contract: ${config_1.botConfig.contracts.positionManager}`);
        // Start the monitor
        monitor_1.default.start();
        // Run an initial scan immediately
        await monitor_1.default.scanAndLiquidate();
        // Set up process handlers for graceful shutdown
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (error) {
        logger_1.default.error(`Error starting liquidation bot: ${error}`);
        process.exit(1);
    }
}
/**
 * Graceful shutdown function
 */
function shutdown() {
    logger_1.default.info('Received shutdown signal');
    // Stop the monitor
    monitor_1.default.stop();
    // Log final statistics
    const stats = monitor_1.default.getStats();
    logger_1.default.info(`Shutting down with the following statistics:`);
    logger_1.default.info(`Total liquidations attempted: ${stats.totalLiquidations}`);
    logger_1.default.info(`Successful liquidations: ${stats.successfulLiquidations}`);
    logger_1.default.info(`Total profit: ${stats.totalProfitUsd}`);
    logger_1.default.info('Liquidation bot shutdown complete');
    process.exit(0);
}
// Execute main function
if (require.main === module) {
    main().catch((error) => {
        logger_1.default.error(`Unhandled error in main: ${error}`);
        process.exit(1);
    });
}
