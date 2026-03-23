import { Connection, PublicKey } from "@solana/web3.js";
import { GatherReport } from "../types.js";
import { StateStore } from "./stateStore.js";
import { writeJsonFile } from "../utils/fs.js";

export class GatherService {
  constructor(
    private readonly connection: Connection,
    private readonly stateStore: StateStore
  ) {}

  async gather(params: {
    targetWallet: string;
    outputPath: string;
    eventLimit?: number;
  }): Promise<GatherReport> {
    const target = new PublicKey(params.targetWallet);
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(target, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    const targetTokenBalances = tokenAccounts.value
      .map((it) => {
        const parsed = it.account.data.parsed?.info;
        return {
          mint: String(parsed?.mint ?? ""),
          amountUi: Number(parsed?.tokenAmount?.uiAmount ?? 0)
        };
      })
      .filter((it) => it.mint && it.amountUi > 0);

    const state = await this.stateStore.load();
    const report: GatherReport = {
      generatedAt: new Date().toISOString(),
      targetWallet: params.targetWallet,
      monitoredPositions: Object.values(state.positions),
      recentEvents: state.eventHistory.slice(-(params.eventLimit ?? 100)),
      targetTokenBalances
    };

    await writeJsonFile(params.outputPath, report);
    return report;
  }
}
