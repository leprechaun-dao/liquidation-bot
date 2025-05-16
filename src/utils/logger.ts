import winston from 'winston';

// Get log level from environment or use default
const logLevel = process.env.LOG_LEVEL || 'info';

// Create a custom format with timestamp, level, and message
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Create the winston logger
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  transports: [
    // Console output for all logs
    new winston.transports.Console(),
    // File output for all logs
    new winston.transports.File({ filename: 'liquidation.log' }),
    // Separate file for errors
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// Helper function to log position details in a readable format
export const logPositionDetails = (position: any, prefix: string = "") => {
  logger.debug(`${prefix}Position ID: ${position.positionId}`);
  logger.debug(`${prefix}Owner: ${position.owner}`);
  logger.debug(`${prefix}Synthetic Asset: ${position.syntheticSymbol} (${position.syntheticAsset})`);
  logger.debug(`${prefix}Collateral Asset: ${position.collateralSymbol} (${position.collateralAsset})`);
  logger.debug(`${prefix}Collateral Amount: ${position.collateralAmount}`);
  logger.debug(`${prefix}Minted Amount: ${position.mintedAmount}`);
  logger.debug(`${prefix}Current Ratio: ${Number(position.currentRatio) / 10000}%`);
  logger.debug(`${prefix}Required Ratio: ${Number(position.requiredRatio) / 10000}%`);
  logger.debug(`${prefix}Is Under-collateralized: ${position.isUnderCollateralized}`);
  logger.debug(`${prefix}Collateral USD Value: $${Number(position.collateralUsdValue) / 10**18}`);
  logger.debug(`${prefix}Debt USD Value: $${Number(position.debtUsdValue) / 10**18}`);
};

// Helper function to log liquidation returns
export const logLiquidationReturns = (returns: any, prefix: string = "") => {
  logger.debug(`${prefix}Synthetic Amount: ${returns.syntheticAmount}`);
  logger.debug(`${prefix}Collateral Received: ${returns.collateralReceived}`);
  logger.debug(`${prefix}Discount: ${Number(returns.discount) / 100}%`);
  logger.debug(`${prefix}Fee: ${returns.fee}`);
};

// Helper function to log profitability assessment
export const logProfitability = (assessment: any, prefix: string = "") => {
  logger.debug(`${prefix}Position ID: ${assessment.positionId}`);
  logger.debug(`${prefix}Is Liquidatable: ${assessment.isLiquidatable}`);
  logger.debug(`${prefix}Debt to Pay: ${assessment.debtToPay} ${assessment.syntheticSymbol}`);
  logger.debug(`${prefix}Collateral to Receive: ${assessment.collateralToReceive} ${assessment.collateralSymbol}`);
  logger.debug(`${prefix}Debt Value USD: $${Number(assessment.debtValueUsd) / 10**18}`);
  logger.debug(`${prefix}Collateral Value USD: $${Number(assessment.collateralValueUsd) / 10**18}`);
  logger.debug(`${prefix}Estimated Profit USD: $${Number(assessment.estimatedProfitUsd) / 10**18}`);
  logger.debug(`${prefix}Is Profitable: ${assessment.isProfitable}`);
  logger.debug(`${prefix}Liquidation Discount: ${Number(assessment.liquidationDiscount) / 100}%`);
};

export default logger;
