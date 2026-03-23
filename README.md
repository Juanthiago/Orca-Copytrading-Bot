# Orca CLMM Copytrading Bot

Solana copytrading bot for **Orca Whirlpool (CLMM)**.

## Features

- Monitor a target wallet and detect Orca CLMM buy/sell transactions.
- Copy buy instantly using your own wallet.
- Configurable sell mode:
  - `USE_OWN_SELL_LOGIC=true`: sell using your own TP/SL rules.
  - `USE_OWN_SELL_LOGIC=false`: sell only when target wallet sells.
- Gather function: export current bot state, recent events, and target wallet token balances.
- Works with Orca CLMM pools configured via `POOL_MAP_JSON`.

## Project Structure

- `src/monitor`: wallet monitoring and Orca trade detection.
- `src/orca`: Orca CLMM swap execution.
- `src/services`: state storage, copytrade logic, sell logic loop, gather report.
- `src/index.ts`: runtime entrypoint.

## Requirements

- Node.js 20+
- Mainnet Solana RPC endpoint (recommended: private RPC for low latency)
- Funded trading wallet

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create env file:

   ```bash
   cp .env.example .env
   ```

3. Configure `.env`:
   - `TARGET_WALLET`: wallet you copy.
   - `TRADER_SECRET_KEY`: your wallet secret key (base58).
   - `COPY_BUY_SIZE_IN_QUOTE`: fixed quote amount per copied buy.
   - `DEFAULT_QUOTE_MINT`: quote mint used to buy/sell (e.g. wSOL).
   - `POOL_MAP_JSON`: map each token mint to Orca Whirlpool address.
   - Sell mode and risk params.

## Run

- Start bot:

  ```bash
  npm run start
  ```

- Run gather function only:

  ```bash
  npm run gather
  ```

Gather output is written to `GATHER_OUTPUT_PATH` (default `.data/gather.json`).

## How It Works

1. Monitor target wallet signatures on Solana.
2. Parse confirmed transactions and keep only Orca Whirlpool interactions.
3. Detect token deltas for target wallet:
   - Positive delta => buy event
   - Negative delta => sell event
4. On target buy, bot executes buy on configured Whirlpool.
5. Sell behavior:
   - Own sell logic mode: periodic TP/SL evaluation.
   - Follow target mode: sell only when target wallet sells.

## Important Notes

- `DRY_RUN=true` is strongly recommended for first tests.
- This bot currently uses a **fixed buy size** per copied trade.
- You must provide accurate `POOL_MAP_JSON`; no auto-routing is included.
- Low-latency and reliability depend heavily on your RPC quality.
- Use at your own risk. Trading and smart contract interaction can lose funds.

## Disclaimer

Educational software only. No financial advice. You are solely responsible for your usage and funds.
