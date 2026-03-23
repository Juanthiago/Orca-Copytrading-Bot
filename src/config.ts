import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envBool = z.string().transform((value) => {
    const normalized = (value ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  });

const schema = z.object({
  RPC_URL: z.string().min(1),
  WS_URL: z.string().optional(),
  TARGET_WALLET: z.string().min(1),
  TRADER_SECRET_KEY: z.string().min(1),
  COPY_BUY_SIZE_IN_QUOTE: z.coerce.number().positive(),
  DEFAULT_QUOTE_MINT: z.string().min(1),
  SLIPPAGE_BPS: z.coerce.number().int().min(1).max(2_000).default(200),
  DRY_RUN: z.string().default("true").pipe(envBool),
  USE_OWN_SELL_LOGIC: z.string().default("true").pipe(envBool),
  TAKE_PROFIT_PCT: z.coerce.number().positive().default(25),
  STOP_LOSS_PCT: z.coerce.number().positive().default(15),
  SELL_LOGIC_POLL_INTERVAL_MS: z.coerce.number().int().min(1_000).default(8_000),
  MONITOR_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(3_000),
  POOL_MAP_JSON: z.string().default("{}"),
  STATE_FILE_PATH: z.string().default(".data/state.json"),
  GATHER_OUTPUT_PATH: z.string().default(".data/gather.json")
});

const parsed = schema.parse(process.env);

let poolMap: Record<string, string> = {};
try {
  const raw = JSON.parse(parsed.POOL_MAP_JSON);
  if (raw && typeof raw === "object") {
    poolMap = raw;
  }
} catch {
  throw new Error("POOL_MAP_JSON must be a valid JSON object map: {\"mint\":\"poolAddress\"}");
}

export const config = {
  rpcUrl: parsed.RPC_URL,
  wsUrl: parsed.WS_URL || undefined,
  targetWallet: parsed.TARGET_WALLET,
  traderSecretKey: parsed.TRADER_SECRET_KEY,
  copyBuySizeInQuote: parsed.COPY_BUY_SIZE_IN_QUOTE,
  defaultQuoteMint: parsed.DEFAULT_QUOTE_MINT,
  slippageBps: parsed.SLIPPAGE_BPS,
  dryRun: parsed.DRY_RUN,
  useOwnSellLogic: parsed.USE_OWN_SELL_LOGIC,
  takeProfitPct: parsed.TAKE_PROFIT_PCT,
  stopLossPct: parsed.STOP_LOSS_PCT,
  sellLogicPollIntervalMs: parsed.SELL_LOGIC_POLL_INTERVAL_MS,
  monitorPollIntervalMs: parsed.MONITOR_POLL_INTERVAL_MS,
  poolMap,
  stateFilePath: parsed.STATE_FILE_PATH,
  gatherOutputPath: parsed.GATHER_OUTPUT_PATH
};
