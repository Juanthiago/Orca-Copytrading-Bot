export type TradeSide = "buy" | "sell";

export interface DetectedTradeEvent {
  signature: string;
  slot: number;
  blockTime: number | null;
  side: TradeSide;
  tokenMint: string;
  tokenAmountDeltaUi: number;
}

export interface Position {
  mint: string;
  amountUi: number;
  entryPriceUsd: number | null;
  openedAt: number;
  sourceSignature: string;
  poolAddress: string;
}

export interface BotState {
  processedSignatures: string[];
  positions: Record<string, Position>;
  eventHistory: DetectedTradeEvent[];
}

export interface GatherReport {
  generatedAt: string;
  targetWallet: string;
  monitoredPositions: Position[];
  recentEvents: DetectedTradeEvent[];
  targetTokenBalances: Array<{
    mint: string;
    amountUi: number;
  }>;
}
