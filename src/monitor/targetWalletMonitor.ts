import { EventEmitter } from "node:events";
import { Connection, PublicKey } from "@solana/web3.js";
import { detectOrcaTrades } from "./tradeDetector.js";
import { DetectedTradeEvent } from "../types.js";
import { logger } from "../logger.js";

interface WalletMonitorOptions {
  connection: Connection;
  targetWallet: string;
  quoteMintToIgnore: string;
  pollIntervalMs: number;
  knownSignatures?: string[];
}

interface WalletMonitorEvents {
  trade: (event: DetectedTradeEvent) => void;
}

export class TargetWalletMonitor extends EventEmitter {
  private readonly targetPubkey: PublicKey;
  private readonly seen = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly options: WalletMonitorOptions) {
    super();
    this.targetPubkey = new PublicKey(options.targetWallet);
    for (const sig of options.knownSignatures ?? []) {
      this.seen.add(sig);
    }
  }

  on<K extends keyof WalletMonitorEvents>(eventName: K, listener: WalletMonitorEvents[K]): this {
    return super.on(eventName, listener);
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    await this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, this.options.pollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getSeenSignatures(): string[] {
    return [...this.seen];
  }

  private async pollOnce(): Promise<void> {
    try {
      const signatures = await this.options.connection.getSignaturesForAddress(this.targetPubkey, {
        limit: 20
      });
      signatures.reverse();

      for (const sigInfo of signatures) {
        if (this.seen.has(sigInfo.signature)) {
          continue;
        }

        const tx = await this.options.connection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed"
        });
        this.seen.add(sigInfo.signature);
        if (!tx) {
          continue;
        }

        const events = detectOrcaTrades({
          tx,
          targetWallet: this.options.targetWallet,
          signature: sigInfo.signature,
          slot: sigInfo.slot,
          blockTime: sigInfo.blockTime ?? null,
          quoteMintToIgnore: this.options.quoteMintToIgnore
        });

        for (const event of events) {
          this.emit("trade", event);
        }
      }

      if (this.seen.size > 6_000) {
        const recent = [...this.seen].slice(-5_000);
        this.seen.clear();
        for (const sig of recent) {
          this.seen.add(sig);
        }
      }
    } catch (error) {
      logger.error({ error }, "Target wallet monitor poll failed");
    }
  }
}
