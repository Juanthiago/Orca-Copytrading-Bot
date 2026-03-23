import { createConnection } from "./solana/connection.js";
import { OrcaCopyTradingBot } from "./bot.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  const connection = createConnection();
  const bot = new OrcaCopyTradingBot(connection);
  const gatherOnly = process.argv.includes("--gather");

  if (gatherOnly) {
    await bot.gatherOnce();
    return;
  }

  await bot.start();
  const shutdown = async () => {
    logger.info("Shutting down...");
    await bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  logger.error({ error }, "Fatal error in main");
  process.exit(1);
});
