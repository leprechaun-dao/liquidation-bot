"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidationMonitor = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const liquidator_1 = __importDefault(require("./liquidator"));
const config_1 = require("./utils/config");
const logger_1 = __importDefault(require("./utils/logger"));
const tokens_1 = require("./utils/tokens");
class LiquidationMonitor {
    constructor() {
        this.cronJob = null;
        this.isRunning = false;
        this.totalLiquidations = 0;
        this.successfulLiquidations = 0;
        this.totalProfitUsd = BigInt(0);
    }
    /**
     * Starts the monitor with a scheduled task
     */
    start() {
        if (this.cronJob) {
            logger_1.default.warn('Monitor is already running');
            return;
        }
        const cronPattern = `*/${config_1.botConfig.scanInterval} * * * * *`; // Run every scanInterval seconds
        logger_1.default.info(`Starting liquidation monitor with pattern: ${cronPattern}`);
        this.cronJob = node_cron_1.default.schedule(cronPattern, async () => {
            await this.scanAndLiquidate();
        });
        logger_1.default.info('Liquidation monitor started');
        logger_1.default.info(`Scanning for liquidatable positions every ${config_1.botConfig.scanInterval} seconds`);
        logger_1.default.info(`Minimum profit threshold: ${(0, tokens_1.formatUsdValue)(config_1.botConfig.minProfitUsd)}`);
        logger_1.default.info(`Maximum gas price: ${config_1.botConfig.maxGasPriceGwei} Gwei`);
        logger_1.default.info(`Batch size: ${config_1.botConfig.batchSize} positions per scan`);
    }
    /**
     * Scans for and executes liquidations in a single run
     */
    async scanAndLiquidate() {
        if (this.isRunning) {
            logger_1.default.debug('Already scanning, skipping this run');
            return;
        }
        this.isRunning = true;
        try {
            logger_1.default.info('Scanning for liquidation opportunities...');
            const results = await liquidator_1.default.scanAndExecuteLiquidations(0, config_1.botConfig.batchSize);
            // Update statistics
            this.totalLiquidations += results.length;
            this.successfulLiquidations += results.filter(r => r.status === 'success').length;
            // Sum up profits
            const profitInThisRun = results.reduce((sum, r) => sum + (r.profitUsd || BigInt(0)), BigInt(0));
            this.totalProfitUsd += profitInThisRun;
            // Log statistics
            if (results.length > 0) {
                logger_1.default.info(`Liquidation run complete. ${results.filter(r => r.status === 'success').length}/${results.length} positions liquidated`);
                logger_1.default.info(`Profit in this run: ${(0, tokens_1.formatUsdValue)(profitInThisRun)}`);
                logger_1.default.info(`Total profit so far: ${(0, tokens_1.formatUsdValue)(this.totalProfitUsd)}`);
                logger_1.default.info(`Success rate: ${(this.successfulLiquidations / this.totalLiquidations * 100).toFixed(2)}%`);
            }
            else {
                logger_1.default.info('No liquidations executed in this run');
            }
        }
        catch (error) {
            logger_1.default.error(`Error in liquidation run: ${error}`);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Stops the monitor
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger_1.default.info('Liquidation monitor stopped');
        }
        else {
            logger_1.default.warn('Monitor is not running');
        }
    }
    /**
     * Returns the current statistics
     */
    getStats() {
        return {
            totalLiquidations: this.totalLiquidations,
            successfulLiquidations: this.successfulLiquidations,
            totalProfitUsd: this.totalProfitUsd,
            isRunning: this.isRunning,
        };
    }
}
exports.LiquidationMonitor = LiquidationMonitor;
exports.default = new LiquidationMonitor();
