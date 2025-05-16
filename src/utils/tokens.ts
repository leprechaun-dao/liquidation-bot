import { publicClient } from './config';
import { ERC20ABI } from '../abi';
import logger from './logger';

/**
 * Gets the token balance for a specific address
 */
export async function getTokenBalance(tokenAddress: string, address: string): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    
    return balance as bigint;
  } catch (error) {
    logger.error(`Error getting token balance: ${error}`);
    throw error;
  }
}

/**
 * Gets the token decimals
 */
export async function getTokenDecimals(tokenAddress: string): Promise<number> {
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'decimals',
    });
    
    return Number(decimals);
  } catch (error) {
    logger.error(`Error getting token decimals: ${error}`);
    throw error;
  }
}

/**
 * Gets the token symbol
 */
export async function getTokenSymbol(tokenAddress: string): Promise<string> {
  try {
    const symbol = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'symbol',
    });
    
    return symbol as string;
  } catch (error) {
    logger.error(`Error getting token symbol: ${error}`);
    throw error;
  }
}

/**
 * Gets the allowance of spender for a token
 */
export async function getTokenAllowance(
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  try {
    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [owner, spender],
    });
    
    return allowance as bigint;
  } catch (error) {
    logger.error(`Error getting token allowance: ${error}`);
    throw error;
  }
}

/**
 * Formats a token amount with the proper decimals and symbol
 */
export async function formatTokenAmount(
  tokenAddress: string,
  amount: bigint,
  maxDecimalPlaces: number = 5
): Promise<string> {
  try {
    const decimals = await getTokenDecimals(tokenAddress);
    const symbol = await getTokenSymbol(tokenAddress);
    
    const divisor = BigInt(10 ** decimals);
    const integerPart = amount / divisor;
    const fractionalPartBigInt = amount % divisor;
    
    // Convert the fractional part to a string with leading zeros
    let fractionalPartString = fractionalPartBigInt.toString().padStart(decimals, '0');
    
    // Trim trailing zeros and limit decimal places
    fractionalPartString = fractionalPartString.replace(/0+$/, '').slice(0, maxDecimalPlaces);
    
    if (fractionalPartString.length > 0) {
      return `${integerPart}.${fractionalPartString} ${symbol}`;
    } else {
      return `${integerPart} ${symbol}`;
    }
  } catch (error) {
    logger.error(`Error formatting token amount: ${error}`);
    return `${amount} ???`;
  }
}

/**
 * Formats a USD value (typically 18 decimals)
 */
export function formatUsdValue(value: bigint, maxDecimalPlaces: number = 2): string {
  const divisor = BigInt(10 ** 18);
  const integerPart = value / divisor;
  const fractionalPartBigInt = value % divisor;
  
  // Convert the fractional part to a string with leading zeros
  let fractionalPartString = fractionalPartBigInt.toString().padStart(18, '0');
  
  // Trim trailing zeros and limit decimal places
  fractionalPartString = fractionalPartString.replace(/0+$/, '').slice(0, maxDecimalPlaces);
  
  if (fractionalPartString.length > 0) {
    return `$${integerPart}.${fractionalPartString}`;
  } else {
    return `$${integerPart}`;
  }
}

export default {
  getTokenBalance,
  getTokenDecimals,
  getTokenSymbol,
  getTokenAllowance,
  formatTokenAmount,
  formatUsdValue,
};
