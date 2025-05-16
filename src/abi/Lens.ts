export const LensABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_positionManager",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "name": "calculateLiquidationReturns",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "syntheticAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "collateralReceived",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "discount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory",
    "outputs": [
      {
        "internalType": "contract LeprechaunFactory",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "skip",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getLiquidatablePositions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "positionId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "syntheticAsset",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "syntheticSymbol",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "collateralAsset",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "collateralSymbol",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "collateralAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "mintedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastUpdateTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "currentRatio",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requiredRatio",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isUnderCollateralized",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "collateralUsdValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "debtUsdValue",
            "type": "uint256"
          }
        ],
        "internalType": "struct LeprechaunLens.PositionDetails[]",
        "name": "positions",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "positionId",
        "type": "uint256"
      }
    ],
    "name": "getPosition",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "positionId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "syntheticAsset",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "syntheticSymbol",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "collateralAsset",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "collateralSymbol",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "collateralAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "mintedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastUpdateTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "currentRatio",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requiredRatio",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isUnderCollateralized",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "collateralUsdValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "debtUsdValue",
            "type": "uint256"
          }
        ],
        "internalType": "struct LeprechaunLens.PositionDetails",
        "name": "details",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "positionManager",
    "outputs": [
      {
        "internalType": "contract PositionManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
