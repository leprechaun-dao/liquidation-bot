# Leprechaun Protocol Liquidation Bot

A TypeScript-based liquidation bot for the Leprechaun Protocol that uses viem for blockchain interactions. This bot automatically monitors the protocol for under-collateralized positions, assesses their profitability, and executes liquidations when profitable.

## Features

- 🔍 **Automated Scanning**: Continuously scans for liquidatable positions
- 💰 **Profitability Assessment**: Calculates potential profit before executing liquidations
- ⚡ **Gas Optimization**: Monitors gas prices and skips liquidations when gas is too high
- 📊 **Logging**: Comprehensive logging of all operations
- 🛡️ **Error Handling**: Robust error handling to ensure reliability
- 🔄 **Batch Processing**: Process multiple liquidations in sequence
- 📱 **Vercel Compatible**: Uses viem for simplicity and performance, compatible with Vercel functions

## Prerequisites

- Node.js v18 or later
- Ethereum private key with some ETH for gas
- Synthetic tokens for repaying debt during liquidations

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and configure the environment variables:

```bash
cp .env.example .env
```

## Configuration

Edit the `.env` file to configure the bot:

```
# Network Configuration
RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your-api-key
CHAIN_ID=1

# Private Key - KEEP THIS SECURE!
LIQUIDATOR_PRIVATE_KEY=your-private-key-here

# Contract Addresses
LENS_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
POSITION_MANAGER_ADDRESS=0x0000000000000000000000000000000000000000
FACTORY_ADDRESS=0x0000000000000000000000000000000000000000

# Bot Configuration
SCAN_INTERVAL_SECONDS=60
GAS_LIMIT=1000000
MAX_GAS_PRICE_GWEI=300
MIN_PROFIT_USD=5
BATCH_SIZE=10

# Logging
LOG_LEVEL=info

# Notification (optional)
DISCORD_WEBHOOK_URL=
```

## Usage

### Build the Bot

```bash
npm run build
```

### Start the Bot

```bash
npm start
```

### Run Just a Scanner

To scan for liquidatable positions without executing liquidations:

```bash
npm run scan
```

### Run a Single Liquidation

To execute a single liquidation for a specific position:

```bash
npm run liquidate -- --position-id 123
```

## Architecture

The bot consists of several key components:

1. **Scanner**: Identifies liquidatable positions and calculates profitability
2. **Liquidator**: Executes liquidations for profitable positions
3. **Monitor**: Schedules scanning and liquidation runs
4. **Utils**: Helper functions for blockchain interactions, logging, and configuration

### Key Files

- `src/index.ts`: Main entry point
- `src/scanner.ts`: Scans for liquidatable positions
- `src/liquidator.ts`: Executes liquidations
- `src/monitor.ts`: Schedules and monitors liquidation runs
- `src/utils/config.ts`: Configuration loading and clients setup
- `src/utils/logger.ts`: Logging utilities
- `src/utils/blockchain.ts`: Blockchain interaction utilities
- `src/utils/tokens.ts`: Token-related utilities

## Deployment as a Vercel Function

This bot can be deployed as a Vercel Function:

1. Fork this repository
2. Connect it to your Vercel account
3. Set up environment variables in Vercel
4. Deploy the function

## Security Considerations

- **Private Key Security**: Never commit your private key to version control
- **Fund Management**: Only keep enough funds for active liquidations
- **Gas Management**: Configure proper gas limits to avoid failed transactions
- **Error Handling**: The bot includes comprehensive error handling to prevent issues

## License

MIT

## Credits

Built for the Leprechaun Protocol