import { config } from "../config.js";
import { logger } from "../logger.js";
import { OrcaClmmTrader } from "../orca/clmmTrader.js";
import { DetectedTradeEvent, Position } from "../types.js";
import { PriceService } from "./priceService.js";
import { StateStore } from "./stateStore.js";

export class CopyTraderService {
  constructor(
    private readonly trader: OrcaClmmTrader,
    private readonly stateStore: StateStore,
    private readonly priceService: PriceService
  ) {}

  async handleTargetTrade(event: DetectedTradeEvent): Promise<void> {
    await this.stateStore.appendEvent(event);
    await this.stateStore.markProcessedSignature(event.signature);

    if (event.side === "buy") {
      await this.copyBuy(event);
      return;
    }

    if (!config.useOwnSellLogic) {
      await this.followTargetSell(event);
    }
  }

  async evaluateOwnSellLogic(): Promise<void> {
    if (!config.useOwnSellLogic) {
      return;
    }

    const state = await this.stateStore.load();
    for (const position of Object.values(state.positions)) {
      const currentPrice = await this.priceService.getPriceUsd(position.mint);
      if (!currentPrice || !position.entryPriceUsd) {
        continue;
      }

      const pnlPct = ((currentPrice - position.entryPriceUsd) / position.entryPriceUsd) * 100;
      if (pnlPct >= config.takeProfitPct || pnlPct <= -config.stopLossPct) {
        logger.info(
          {
            mint: position.mint,
            entryPriceUsd: position.entryPriceUsd,
            currentPrice,
            pnlPct
          },
          "Own sell logic triggered"
        );
        await this.sellPosition(position);
      }
    }
  }

  private async copyBuy(event: DetectedTradeEvent): Promise<void> {
    const poolAddress = config.poolMap[event.tokenMint];
    if (!poolAddress) {
      logger.warn({ mint: event.tokenMint }, "No pool mapping configured for mint, skipping buy");
      return;
    }

    const signature = await this.trader.executeSwap({
      poolAddress,
      inputMint: config.defaultQuoteMint,
      outputMint: event.tokenMint,
      amountInUi: config.copyBuySizeInQuote,
      slippageBps: config.slippageBps,
      dryRun: config.dryRun
    });

    const entryPriceUsd = await this.priceService.getPriceUsd(event.tokenMint);
    const position: Position = {
      mint: event.tokenMint,
      amountUi: event.tokenAmountDeltaUi,
      entryPriceUsd,
      openedAt: Date.now(),
      sourceSignature: signature,
      poolAddress
    };
    await this.stateStore.upsertPosition(position);

    logger.info({ event, signature }, "Mirrored buy completed");
  }

  private async followTargetSell(event: DetectedTradeEvent): Promise<void> {
    const state = await this.stateStore.load();
    const position = state.positions[event.tokenMint];
    if (!position) {
      return;
    }
    logger.info({ event }, "Target sold token, mirroring sell");
    await this.sellPosition(position);
  }

  private async sellPosition(position: Position): Promise<void> {
    await this.trader.executeSwap({
      poolAddress: position.poolAddress,
      inputMint: position.mint,
      outputMint: config.defaultQuoteMint,
      amountInUi: position.amountUi,
      slippageBps: config.slippageBps,
      dryRun: config.dryRun
    });

    await this.stateStore.deletePosition(position.mint);
  }
}
