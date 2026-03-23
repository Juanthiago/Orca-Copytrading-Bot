import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import Decimal from "decimal.js";
import { logger } from "../logger.js";

interface SwapParams {
  poolAddress: string;
  inputMint: string;
  outputMint: string;
  amountInUi: number;
  slippageBps: number;
  dryRun: boolean;
}

export class OrcaClmmTrader {
  constructor(
    private readonly connection: Connection,
    private readonly traderKeypair: Keypair
  ) {}

  async executeSwap(params: SwapParams): Promise<string> {
    if (params.dryRun) {
      logger.info({ params }, "DRY_RUN enabled, skipping on-chain swap");
      return `dry-run-${Date.now()}`;
    }

    const sdk = (await import("@orca-so/whirlpools-sdk")) as any;
    const commonSdk = (await import("@orca-so/common-sdk")) as any;
    const anchor = (await import("@coral-xyz/anchor")) as any;

    const provider = new anchor.AnchorProvider(
      this.connection,
      new anchor.Wallet(this.traderKeypair),
      { commitment: "confirmed" }
    );

    const ctx = sdk.WhirlpoolContext.withProvider(
      provider,
      new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc")
    );
    const client = sdk.buildWhirlpoolClient(ctx);
    const whirlpool = await client.getPool(new PublicKey(params.poolAddress));

    const inputMintInfo = await getMint(this.connection, new PublicKey(params.inputMint));
    const amountIn = commonSdk.DecimalUtil.toBN(
      new Decimal(params.amountInUi),
      inputMintInfo.decimals
    );

    const quote = await sdk.swapQuoteByInputToken(
      whirlpool,
      new PublicKey(params.inputMint),
      amountIn,
      commonSdk.Percentage.fromFraction(params.slippageBps, 10_000),
      ctx.program.programId,
      ctx.fetcher,
      true
    );

    const tx = await whirlpool.swap(quote);
    const signature = await tx.buildAndExecute();
    logger.info({ signature, params }, "Swap executed on Orca CLMM");
    return signature;
  }
}
