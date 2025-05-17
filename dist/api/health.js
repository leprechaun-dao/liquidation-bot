"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const config_1 = require("../utils/config");
/**
 * Health check API endpoint
 */
async function handler(request, response) {
    return response.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            chainId: config_1.botConfig.chainConfig.id,
            scanInterval: config_1.botConfig.scanInterval,
            batchSize: config_1.botConfig.batchSize,
            contracts: {
                lens: config_1.botConfig.contracts.lens,
                positionManager: config_1.botConfig.contracts.positionManager,
            },
        },
    });
}
