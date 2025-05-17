import { VercelRequest, VercelResponse } from '@vercel/node';
import { botConfig } from '../utils/config';

/**
 * Health check API endpoint
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  return response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      chainId: botConfig.chainConfig.id,
      scanInterval: botConfig.scanInterval,
      batchSize: botConfig.batchSize,
      contracts: {
        lens: botConfig.contracts.lens,
        positionManager: botConfig.contracts.positionManager,
      },
    },
  });
}
