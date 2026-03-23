import { Connection } from "@solana/web3.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { TargetWalletMonitor } from "./monitor/targetWalletMonitor.js";
import { OrcaClmmTrader } from "./orca/clmmTrader.js";
import { keypairFromBase58 } from "./solana/wallet.js";
import { CopyTraderService } from "./services/copyTrader.js";
import { GatherService } from "./services/gatherService.js";
import { PriceService } from "./services/priceService.js";
import { StateStore } from "./services/stateStore.js";

export class OrcaCopyTradingBot {
  private readonly stateStore: StateStore;
  private readonly priceService: PriceService;
  private readonly trader: OrcaClmmTrader;
  private readonly copyTraderService: CopyTraderService;
  private readonly gatherService: GatherService;
  private sellTimer: NodeJS.Timeout | null = null;
  private monitor: TargetWalletMonitor | null = null;

  constructor(private readonly connection: Connection) {
    this.stateStore = new StateStore(config.stateFilePath);
    this.priceService = new PriceService();
    this.trader = new OrcaClmmTrader(this.connection, keypairFromBase58(config.traderSecretKey));
    this.copyTraderService = new CopyTraderService(
      this.trader,
      this.stateStore,
      this.priceService
    );
    this.gatherService = new GatherService(this.connection, this.stateStore);
  }

  async start(): Promise<void> {
    const state = await this.stateStore.load();
    this.monitor = new TargetWalletMonitor({
      connection: this.connection,
      targetWallet: config.targetWallet,
      quoteMintToIgnore: config.defaultQuoteMint,
      pollIntervalMs: config.monitorPollIntervalMs,
      knownSignatures: state.processedSignatures
    });

    this.monitor.on("trade", (event) => {
      void this.copyTraderService.handleTargetTrade(event);
    });

    await this.monitor.start();
    this.sellTimer = setInterval(() => {
      void this.copyTraderService.evaluateOwnSellLogic();
    }, config.sellLogicPollIntervalMs);

    logger.info(
      {
        targetWallet: config.targetWallet,
        useOwnSellLogic: config.useOwnSellLogic,
        dryRun: config.dryRun
      },
      "Orca copytrading bot started"
    );
  }

  async gatherOnce(): Promise<void> {
    const report = await this.gatherService.gather({
      targetWallet: config.targetWallet,
      outputPath: config.gatherOutputPath
    });
    logger.info({ reportPath: config.gatherOutputPath, generatedAt: report.generatedAt }, "Gather completed");
  }

  async stop(): Promise<void> {
    this.monitor?.stop();
    if (this.sellTimer) {
      clearInterval(this.sellTimer);
      this.sellTimer = null;
    }
    if (this.monitor) {
      await this.stateStore.save({
        ...(await this.stateStore.load()),
        processedSignatures: this.monitor.getSeenSignatures()
      });
    }
  }
}
