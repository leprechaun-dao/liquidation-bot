import { formatEther, parseEther } from 'viem';
import { publicClient, walletClient, botConfig } from './config';
import { GasEstimate } from '../types';
import logger from './logger';

/**
 * Formats a bigint value with the specified number of decimals to a readable string
 */
export function formatBigIntWithDecimals(value: bigint, decimals: number = 18, maxDecimalPlaces: number = 5): string {
  if (value === BigInt(0)) return '0';
  
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPartBigInt = value % divisor;
  
  // Convert the fractional part to a string with leading zeros
  let fractionalPartString = fractionalPartBigInt.toString().padStart(decimals, '0');
  
  // Trim trailing zeros and limit decimal places
  fractionalPartString = fractionalPartString.replace(/0+$/, '').slice(0, maxDecimalPlaces);
  
  if (fractionalPartString.length > 0) {
    return `${integerPart}.${fractionalPartString}`;
  } else {
    return integerPart.toString();
  }
}

/**
 * Estimates the gas cost for a transaction
 */
export async function estimateGasCost(
  to: string,
  data: string,
  value: bigint = BigInt(0)
): Promise<GasEstimate> {
  try {
    // Estimate gas limit
    const gasLimit = await publicClient.estimateGas({
      account: walletClient.account?.address,
      to: to as `0x${string}`,
      data: data as `0x${string}`,
      value,
    });

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();

    // Calculate total cost
    const estimatedCostWei = gasLimit * gasPrice;
    const estimatedCostEth = formatEther(estimatedCostWei);

    return {
      gasLimit,
      gasPrice,
      estimatedCostWei,
      estimatedCostEth,
    };
  } catch (error) {
    logger.error(`Error estimating gas cost: ${error}`);
    throw error;
  }
}

/**
 * Checks if the current gas price is below the configured maximum
 */
export async function isGasPriceAcceptable(): Promise<boolean> {
  try {
    const gasPrice = await publicClient.getGasPrice();
    const gasPriceGwei = Number(formatEther(gasPrice * BigInt(10 ** 9)));
    
    if (gasPriceGwei > botConfig.maxGasPriceGwei) {
      logger.warn(`Current gas price (${gasPriceGwei} Gwei) exceeds maximum allowed (${botConfig.maxGasPriceGwei} Gwei)`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Error checking gas price: ${error}`);
    return false;
  }
}

/**
 * Waits for a transaction receipt with timeout
 */
export async function waitForReceipt(
  txHash: string,
  timeout: number = 60000
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      
      if (receipt) {
        return receipt;
      }
    } catch (error) {
      // Ignore error, we'll retry
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Transaction receipt not found after ${timeout}ms: ${txHash}`);
}

/**
 * Enhances a transaction receipt with calculated costs
 */
export function enhanceTransactionReceipt(receipt: any) {
  // Ensure both values are bigint
  const gasUsed = BigInt(receipt.gasUsed);
  const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);
  
  // Calculate the total cost
  const totalCostWei = gasUsed * effectiveGasPrice;
  
  return {
    ...receipt,
    totalCostWei,
    totalCostEth: formatEther(totalCostWei),
    status: receipt.status === 1n ? 'success' : 'failure',
  };
}

export default {
  formatBigIntWithDecimals,
  estimateGasCost,
  isGasPriceAcceptable,
  waitForReceipt,
  enhanceTransactionReceipt,
};
