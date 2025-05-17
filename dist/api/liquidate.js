"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const scanner_1 = __importDefault(require("../scanner"));
const liquidator_1 = __importDefault(require("../liquidator"));
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = require("../utils/config");
/**
 * Main API endpoint for scanning and executing liquidations
 */
async function handler(request, response) {
    try {
        // Check for API key (optional security measure)
        const apiKey = request.headers['x-api-key'] || request.query.apiKey;
        const configuredApiKey = process.env.API_KEY;
        if (configuredApiKey && apiKey !== configuredApiKey) {
            return response.status(401).json({
                success: false,
                error: 'Unauthorized - Invalid API key',
            });
        }
        // Process based on the request method and action
        const action = request.query.action || 'scan';
        switch (action) {
            case 'scan':
                // Just scan for liquidatable positions without executing
                const skip = Number(request.query.skip || '0');
                const limit = Number(request.query.limit || String(config_1.botConfig.batchSize));
                logger_1.default.info(`API request to scan for liquidatable positions (skip: ${skip}, limit: ${limit})`);
                const profitableLiquidations = await scanner_1.default.scanForProfitableLiquidations(skip, limit);
                return response.status(200).json({
                    success: true,
                    data: {
                        profitableLiquidations: profitableLiquidations.map(l => ({
                            ...l,
                            debtToPay: l.debtToPay.toString(),
                            collateralToReceive: l.collateralToReceive.toString(),
                            collateralValueUsd: l.collateralValueUsd.toString(),
                            debtValueUsd: l.debtValueUsd.toString(),
                            estimatedProfitUsd: l.estimatedProfitUsd.toString(),
                            liquidationDiscount: l.liquidationDiscount.toString(),
                            currentRatio: l.currentRatio.toString(),
                            requiredRatio: l.requiredRatio.toString(),
                            positionId: l.positionId.toString(),
                        })),
                        count: profitableLiquidations.length,
                    },
                });
            case 'liquidate':
                // Liquidate a specific position
                const positionId = request.query.positionId;
                if (!positionId) {
                    return response.status(400).json({
                        success: false,
                        error: 'Missing positionId parameter',
                    });
                }
                logger_1.default.info(`API request to liquidate position ${positionId}`);
                const result = await liquidator_1.default.executeLiquidation(BigInt(positionId));
                return response.status(200).json({
                    success: true,
                    data: {
                        ...result,
                        positionId: result.positionId.toString(),
                        collateralReceived: result.collateralReceived?.toString(),
                        profitUsd: result.profitUsd?.toString(),
                    },
                });
            case 'scan-and-liquidate':
                // Scan and liquidate profitable positions
                logger_1.default.info('API request to scan and liquidate profitable positions');
                const results = await liquidator_1.default.scanAndExecuteLiquidations();
                return response.status(200).json({
                    success: true,
                    data: {
                        results: results.map(r => ({
                            ...r,
                            positionId: r.positionId.toString(),
                            collateralReceived: r.collateralReceived?.toString(),
                            profitUsd: r.profitUsd?.toString(),
                        })),
                        count: results.length,
                        successCount: results.filter(r => r.status === 'success').length,
                    },
                });
            default:
                return response.status(400).json({
                    success: false,
                    error: `Unknown action: ${action}`,
                });
        }
    }
    catch (error) {
        logger_1.default.error(`API error: ${error}`);
        return response.status(500).json({
            success: false,
            error: `Internal server error: ${error}`,
        });
    }
}
