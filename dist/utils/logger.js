"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logProfitability = exports.logLiquidationReturns = exports.logPositionDetails = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
// Get log level from environment or use default
const logLevel = process.env.LOG_LEVEL || 'info';
// Create a custom format with timestamp, level, and message
const customFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
}));
// Create the winston logger
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: customFormat,
    transports: [
        // Console output for all logs
        new winston_1.default.transports.Console(),
        // File output for all logs
        new winston_1.default.transports.File({ filename: 'liquidation.log' }),
        // Separate file for errors
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' })
    ]
});
// Helper function to log position details in a readable format
const logPositionDetails = (position, prefix = "") => {
    exports.logger.debug(`${prefix}Position ID: ${position.positionId}`);
    exports.logger.debug(`${prefix}Owner: ${position.owner}`);
    exports.logger.debug(`${prefix}Synthetic Asset: ${position.syntheticSymbol} (${position.syntheticAsset})`);
    exports.logger.debug(`${prefix}Collateral Asset: ${position.collateralSymbol} (${position.collateralAsset})`);
    exports.logger.debug(`${prefix}Collateral Amount: ${position.collateralAmount}`);
    exports.logger.debug(`${prefix}Minted Amount: ${position.mintedAmount}`);
    exports.logger.debug(`${prefix}Current Ratio: ${Number(position.currentRatio) / 10000}%`);
    exports.logger.debug(`${prefix}Required Ratio: ${Number(position.requiredRatio) / 10000}%`);
    exports.logger.debug(`${prefix}Is Under-collateralized: ${position.isUnderCollateralized}`);
    exports.logger.debug(`${prefix}Collateral USD Value: $${Number(position.collateralUsdValue) / 10 ** 18}`);
    exports.logger.debug(`${prefix}Debt USD Value: $${Number(position.debtUsdValue) / 10 ** 18}`);
};
exports.logPositionDetails = logPositionDetails;
// Helper function to log liquidation returns
const logLiquidationReturns = (returns, prefix = "") => {
    exports.logger.debug(`${prefix}Synthetic Amount: ${returns.syntheticAmount}`);
    exports.logger.debug(`${prefix}Collateral Received: ${returns.collateralReceived}`);
    exports.logger.debug(`${prefix}Discount: ${Number(returns.discount) / 100}%`);
    exports.logger.debug(`${prefix}Fee: ${returns.fee}`);
};
exports.logLiquidationReturns = logLiquidationReturns;
// Helper function to log profitability assessment
const logProfitability = (assessment, prefix = "") => {
    exports.logger.debug(`${prefix}Position ID: ${assessment.positionId}`);
    exports.logger.debug(`${prefix}Is Liquidatable: ${assessment.isLiquidatable}`);
    exports.logger.debug(`${prefix}Debt to Pay: ${assessment.debtToPay} ${assessment.syntheticSymbol}`);
    exports.logger.debug(`${prefix}Collateral to Receive: ${assessment.collateralToReceive} ${assessment.collateralSymbol}`);
    exports.logger.debug(`${prefix}Debt Value USD: $${Number(assessment.debtValueUsd) / 10 ** 18}`);
    exports.logger.debug(`${prefix}Collateral Value USD: $${Number(assessment.collateralValueUsd) / 10 ** 18}`);
    exports.logger.debug(`${prefix}Estimated Profit USD: $${Number(assessment.estimatedProfitUsd) / 10 ** 18}`);
    exports.logger.debug(`${prefix}Is Profitable: ${assessment.isProfitable}`);
    exports.logger.debug(`${prefix}Liquidation Discount: ${Number(assessment.liquidationDiscount) / 100}%`);
};
exports.logProfitability = logProfitability;
exports.default = exports.logger;
