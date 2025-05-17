"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBigIntWithDecimals = formatBigIntWithDecimals;
exports.estimateGasCost = estimateGasCost;
exports.isGasPriceAcceptable = isGasPriceAcceptable;
exports.waitForReceipt = waitForReceipt;
exports.enhanceTransactionReceipt = enhanceTransactionReceipt;
const viem_1 = require("viem");
const config_1 = require("./config");
const logger_1 = __importDefault(require("./logger"));
/**
 * Formats a bigint value with the specified number of decimals to a readable string
 */
function formatBigIntWithDecimals(value, decimals = 18, maxDecimalPlaces = 5) {
    if (value === BigInt(0))
        return '0';
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPartBigInt = value % divisor;
    // Convert the fractional part to a string with leading zeros
    let fractionalPartString = fractionalPartBigInt.toString().padStart(decimals, '0');
    // Trim trailing zeros and limit decimal places
    fractionalPartString = fractionalPartString.replace(/0+$/, '').slice(0, maxDecimalPlaces);
    if (fractionalPartString.length > 0) {
        return `${integerPart}.${fractionalPartString}`;
    }
    else {
        return integerPart.toString();
    }
}
/**
 * Estimates the gas cost for a transaction
 */
async function estimateGasCost(to, data, value = BigInt(0)) {
    try {
        // Estimate gas limit
        const gasLimit = await config_1.publicClient.estimateGas({
            account: config_1.walletClient.account?.address,
            to: to,
            data: data,
            value,
        });
        // Get current gas price
        const gasPrice = await config_1.publicClient.getGasPrice();
        // Calculate total cost
        const estimatedCostWei = gasLimit * gasPrice;
        const estimatedCostEth = (0, viem_1.formatEther)(estimatedCostWei);
        return {
            gasLimit,
            gasPrice,
            estimatedCostWei,
            estimatedCostEth,
        };
    }
    catch (error) {
        logger_1.default.error(`Error estimating gas cost: ${error}`);
        throw error;
    }
}
/**
 * Checks if the current gas price is below the configured maximum
 */
async function isGasPriceAcceptable() {
    try {
        const gasPrice = await config_1.publicClient.getGasPrice();
        const gasPriceGwei = Number((0, viem_1.formatEther)(gasPrice * BigInt(10 ** 9)));
        if (gasPriceGwei > config_1.botConfig.maxGasPriceGwei) {
            logger_1.default.warn(`Current gas price (${gasPriceGwei} Gwei) exceeds maximum allowed (${config_1.botConfig.maxGasPriceGwei} Gwei)`);
            return false;
        }
        return true;
    }
    catch (error) {
        logger_1.default.error(`Error checking gas price: ${error}`);
        return false;
    }
}
/**
 * Waits for a transaction receipt with timeout
 */
async function waitForReceipt(txHash, timeout = 60000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const receipt = await config_1.publicClient.getTransactionReceipt({
                hash: txHash,
            });
            if (receipt) {
                return receipt;
            }
        }
        catch (error) {
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
function enhanceTransactionReceipt(receipt) {
    // Ensure both values are bigint
    const gasUsed = BigInt(receipt.gasUsed);
    const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);
    // Calculate the total cost
    const totalCostWei = gasUsed * effectiveGasPrice;
    return {
        ...receipt,
        totalCostWei,
        totalCostEth: (0, viem_1.formatEther)(totalCostWei),
        status: receipt.status === 1n ? 'success' : 'failure',
    };
}
exports.default = {
    formatBigIntWithDecimals,
    estimateGasCost,
    isGasPriceAcceptable,
    waitForReceipt,
    enhanceTransactionReceipt,
};
