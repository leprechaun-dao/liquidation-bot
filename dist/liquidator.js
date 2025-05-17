"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidationExecutor = void 0;
const config_1 = require("./utils/config");
const scanner_1 = require("./scanner");
const abi_1 = require("./abi");
const logger_1 = __importDefault(require("./utils/logger"));
const tokens_1 = require("./utils/tokens");
const blockchain_1 = require("./utils/blockchain");
class LiquidationExecutor {
    constructor(positionManagerAddress = config_1.botConfig.contracts.positionManager, scanner = new scanner_1.LiquidationScanner()) {
        this.positionManagerAddress = positionManagerAddress;
        this.scanner = scanner;
    }
    /**
     * Checks and approves token allowance if needed
     */
    async checkAndApproveTokenAllowance(tokenAddress, spenderAddress, amount) {
        try {
            const owner = config_1.botConfig.liquidator.address;
            // Check current allowance
            const currentAllowance = await (0, tokens_1.getTokenAllowance)(tokenAddress, owner, spenderAddress);
            // If current allowance is sufficient, return true
            if (currentAllowance >= amount) {
                logger_1.default.debug(`Current allowance (${currentAllowance}) is sufficient for ${amount}`);
                return true;
            }
            // If current allowance is insufficient, approve the token
            logger_1.default.info(`Approving ${await (0, tokens_1.formatTokenAmount)(tokenAddress, amount)} for ${spenderAddress}`);
            // Prepare the transaction
            const { request } = await config_1.publicClient.simulateContract({
                account: config_1.walletClient.account,
                address: tokenAddress,
                abi: abi_1.ERC20ABI,
                functionName: 'approve',
                args: [spenderAddress, amount],
            });
            // Check gas price is acceptable
            if (!(await (0, blockchain_1.isGasPriceAcceptable)())) {
                logger_1.default.warn('Gas price is too high, skipping approval');
                return false;
            }
            // Execute the transaction
            const txHash = await config_1.walletClient.writeContract(request);
            logger_1.default.info(`Approval transaction sent: ${txHash}`);
            // Wait for the transaction to be mined
            const receipt = await (0, blockchain_1.waitForReceipt)(txHash);
            const enhancedReceipt = (0, blockchain_1.enhanceTransactionReceipt)(receipt);
            if (enhancedReceipt.status === 'success') {
                logger_1.default.info(`Approval successful, gas used: ${enhancedReceipt.gasUsed}, cost: ${enhancedReceipt.totalCostEth} ETH`);
                return true;
            }
            else {
                logger_1.default.error(`Approval failed`);
                return false;
            }
        }
        catch (error) {
            logger_1.default.error(`Error approving token: ${error}`);
            return false;
        }
    }
    /**
     * Checks if the liquidator has sufficient balance to execute a liquidation
     */
    async checkLiquidatorBalance(tokenAddress, requiredAmount) {
        try {
            const balance = await (0, tokens_1.getTokenBalance)(tokenAddress, config_1.botConfig.liquidator.address);
            logger_1.default.debug(`Liquidator balance: ${await (0, tokens_1.formatTokenAmount)(tokenAddress, balance)}, required: ${await (0, tokens_1.formatTokenAmount)(tokenAddress, requiredAmount)}`);
            return balance >= requiredAmount;
        }
        catch (error) {
            logger_1.default.error(`Error checking liquidator balance: ${error}`);
            return false;
        }
    }
    /**
     * Executes a liquidation for a position
     */
    async executeLiquidation(positionId) {
        try {
            logger_1.default.info(`Executing liquidation for position ${positionId}...`);
            // Verify position is still liquidatable
            const isLiquidatable = await this.scanner.isPositionLiquidatable(positionId);
            if (!isLiquidatable) {
                logger_1.default.warn(`Position ${positionId} is no longer liquidatable`);
                return {
                    positionId,
                    transactionHash: '',
                    status: 'failure',
                    error: 'Position is no longer liquidatable',
                };
            }
            // Get liquidation details
            const assessment = await this.scanner.assessLiquidationProfitability(positionId);
            if (!assessment.isLiquidatable || !assessment.isProfitable) {
                logger_1.default.warn(`Position ${positionId} is not profitable to liquidate`);
                return {
                    positionId,
                    transactionHash: '',
                    status: 'failure',
                    error: 'Position is not profitable to liquidate',
                };
            }
            // Check if liquidator has sufficient balance of the synthetic asset
            const hasSufficientBalance = await this.checkLiquidatorBalance(assessment.syntheticAsset, assessment.debtToPay);
            if (!hasSufficientBalance) {
                logger_1.default.error(`Insufficient balance to liquidate position ${positionId}`);
                return {
                    positionId,
                    transactionHash: '',
                    status: 'failure',
                    error: 'Insufficient balance',
                };
            }
            // Approve the position manager to spend the synthetic asset
            const isApproved = await this.checkAndApproveTokenAllowance(assessment.syntheticAsset, this.positionManagerAddress, assessment.debtToPay);
            if (!isApproved) {
                logger_1.default.error(`Failed to approve position manager to spend synthetic asset`);
                return {
                    positionId,
                    transactionHash: '',
                    status: 'failure',
                    error: 'Failed to approve position manager',
                };
            }
            // Prepare the liquidation transaction
            const { request } = await config_1.publicClient.simulateContract({
                account: config_1.walletClient.account,
                address: this.positionManagerAddress,
                abi: abi_1.PositionManagerABI,
                functionName: 'liquidate',
                args: [positionId],
            });
            // Check gas price is acceptable
            if (!(await (0, blockchain_1.isGasPriceAcceptable)())) {
                logger_1.default.warn('Gas price is too high, skipping liquidation');
                return {
                    positionId,
                    transactionHash: '',
                    status: 'failure',
                    error: 'Gas price too high',
                };
            }
            // Execute the liquidation
            const txHash = await config_1.walletClient.writeContract(request);
            logger_1.default.info(`Liquidation transaction sent: ${txHash}`);
            // Wait for the transaction to be mined
            const receipt = await (0, blockchain_1.waitForReceipt)(txHash);
            const enhancedReceipt = (0, blockchain_1.enhanceTransactionReceipt)(receipt);
            if (enhancedReceipt.status === 'success') {
                logger_1.default.info(`Liquidation successful for position ${positionId}`);
                logger_1.default.info(`Gas used: ${enhancedReceipt.gasUsed}, cost: ${enhancedReceipt.totalCostEth} ETH`);
                logger_1.default.info(`Estimated profit: ${(0, tokens_1.formatUsdValue)(assessment.estimatedProfitUsd)}`);
                return {
                    positionId,
                    transactionHash: txHash,
                    status: 'success',
                    receipt: enhancedReceipt,
                    collateralReceived: assessment.collateralToReceive,
                    profitUsd: assessment.estimatedProfitUsd,
                };
            }
            else {
                logger_1.default.error(`Liquidation failed for position ${positionId}`);
                return {
                    positionId,
                    transactionHash: txHash,
                    status: 'failure',
                    error: 'Transaction failed',
                    receipt: enhancedReceipt,
                };
            }
        }
        catch (error) {
            logger_1.default.error(`Error executing liquidation for position ${positionId}: ${error}`);
            return {
                positionId,
                transactionHash: '',
                status: 'failure',
                error: `${error}`,
            };
        }
    }
    /**
     * Scans for profitable liquidations and executes them
     */
    async scanAndExecuteLiquidations(skip = 0, limit = config_1.botConfig.batchSize) {
        try {
            logger_1.default.info('Scanning for profitable liquidations...');
            // Scan for profitable liquidations
            const profitableLiquidations = await this.scanner.scanForProfitableLiquidations(skip, limit);
            if (profitableLiquidations.length === 0) {
                logger_1.default.info('No profitable liquidations found');
                return [];
            }
            logger_1.default.info(`Found ${profitableLiquidations.length} profitable liquidations`);
            // Execute each liquidation
            const results = [];
            for (const liquidation of profitableLiquidations) {
                logger_1.default.info(`Processing liquidation for position ${liquidation.positionId}...`);
                // Execute the liquidation
                const result = await this.executeLiquidation(liquidation.positionId);
                results.push(result);
                // If liquidation was successful, log the result
                if (result.status === 'success') {
                    logger_1.default.info(`Successfully liquidated position ${liquidation.positionId}`);
                    logger_1.default.info(`Collateral received: ${await (0, tokens_1.formatTokenAmount)(liquidation.collateralAsset, result.collateralReceived || BigInt(0))}`);
                    logger_1.default.info(`Estimated profit: ${(0, tokens_1.formatUsdValue)(result.profitUsd || BigInt(0))}`);
                }
                else {
                    logger_1.default.warn(`Failed to liquidate position ${liquidation.positionId}: ${result.error}`);
                }
                // Brief pause between liquidations to avoid nonce issues
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            return results;
        }
        catch (error) {
            logger_1.default.error(`Error in scanAndExecuteLiquidations: ${error}`);
            throw error;
        }
    }
}
exports.LiquidationExecutor = LiquidationExecutor;
exports.default = new LiquidationExecutor();
