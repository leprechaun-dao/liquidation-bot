"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenBalance = getTokenBalance;
exports.getTokenDecimals = getTokenDecimals;
exports.getTokenSymbol = getTokenSymbol;
exports.getTokenAllowance = getTokenAllowance;
exports.formatTokenAmount = formatTokenAmount;
exports.formatUsdValue = formatUsdValue;
const config_1 = require("./config");
const abi_1 = require("../abi");
const logger_1 = __importDefault(require("./logger"));
/**
 * Gets the token balance for a specific address
 */
async function getTokenBalance(tokenAddress, address) {
    try {
        const balance = await config_1.publicClient.readContract({
            address: tokenAddress,
            abi: abi_1.ERC20ABI,
            functionName: 'balanceOf',
            args: [address],
        });
        return balance;
    }
    catch (error) {
        logger_1.default.error(`Error getting token balance: ${error}`);
        throw error;
    }
}
/**
 * Gets the token decimals
 */
async function getTokenDecimals(tokenAddress) {
    try {
        const decimals = await config_1.publicClient.readContract({
            address: tokenAddress,
            abi: abi_1.ERC20ABI,
            functionName: 'decimals',
        });
        return Number(decimals);
    }
    catch (error) {
        logger_1.default.error(`Error getting token decimals: ${error}`);
        throw error;
    }
}
/**
 * Gets the token symbol
 */
async function getTokenSymbol(tokenAddress) {
    try {
        const symbol = await config_1.publicClient.readContract({
            address: tokenAddress,
            abi: abi_1.ERC20ABI,
            functionName: 'symbol',
        });
        return symbol;
    }
    catch (error) {
        logger_1.default.error(`Error getting token symbol: ${error}`);
        throw error;
    }
}
/**
 * Gets the allowance of spender for a token
 */
async function getTokenAllowance(tokenAddress, owner, spender) {
    try {
        const allowance = await config_1.publicClient.readContract({
            address: tokenAddress,
            abi: abi_1.ERC20ABI,
            functionName: 'allowance',
            args: [owner, spender],
        });
        return allowance;
    }
    catch (error) {
        logger_1.default.error(`Error getting token allowance: ${error}`);
        throw error;
    }
}
/**
 * Formats a token amount with the proper decimals and symbol
 */
async function formatTokenAmount(tokenAddress, amount, maxDecimalPlaces = 5) {
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
        }
        else {
            return `${integerPart} ${symbol}`;
        }
    }
    catch (error) {
        logger_1.default.error(`Error formatting token amount: ${error}`);
        return `${amount} ???`;
    }
}
/**
 * Formats a USD value (typically 18 decimals)
 */
function formatUsdValue(value, maxDecimalPlaces = 2) {
    const divisor = BigInt(10 ** 18);
    const integerPart = value / divisor;
    const fractionalPartBigInt = value % divisor;
    // Convert the fractional part to a string with leading zeros
    let fractionalPartString = fractionalPartBigInt.toString().padStart(18, '0');
    // Trim trailing zeros and limit decimal places
    fractionalPartString = fractionalPartString.replace(/0+$/, '').slice(0, maxDecimalPlaces);
    if (fractionalPartString.length > 0) {
        return `$${integerPart}.${fractionalPartString}`;
    }
    else {
        return `$${integerPart}`;
    }
}
exports.default = {
    getTokenBalance,
    getTokenDecimals,
    getTokenSymbol,
    getTokenAllowance,
    formatTokenAmount,
    formatUsdValue,
};
