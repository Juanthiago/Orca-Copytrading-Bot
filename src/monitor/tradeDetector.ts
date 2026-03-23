import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import { DetectedTradeEvent } from "../types.js";

const ORCA_WHIRLPOOL_PROGRAM = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");

function txTouchesOrca(tx: ParsedTransactionWithMeta): boolean {
  const staticKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
  return staticKeys.includes(ORCA_WHIRLPOOL_PROGRAM.toBase58());
}

function extractOwnerTokenDeltas(
  tx: ParsedTransactionWithMeta,
  owner: string
): Record<string, number> {
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const deltas: Record<string, number> = {};

  for (const balance of pre) {
    if (balance.owner !== owner) {
      continue;
    }
    const amount = Number(balance.uiTokenAmount.uiAmount ?? 0);
    deltas[balance.mint] = (deltas[balance.mint] ?? 0) - amount;
  }

  for (const balance of post) {
    if (balance.owner !== owner) {
      continue;
    }
    const amount = Number(balance.uiTokenAmount.uiAmount ?? 0);
    deltas[balance.mint] = (deltas[balance.mint] ?? 0) + amount;
  }

  return deltas;
}

export function detectOrcaTrades(params: {
  tx: ParsedTransactionWithMeta;
  targetWallet: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  quoteMintToIgnore: string;
}): DetectedTradeEvent[] {
  const { tx, targetWallet, signature, slot, blockTime, quoteMintToIgnore } = params;

  if (!tx.meta || tx.meta.err) {
    return [];
  }
  if (!txTouchesOrca(tx)) {
    return [];
  }

  const deltas = extractOwnerTokenDeltas(tx, targetWallet);
  const events: DetectedTradeEvent[] = [];

  for (const [mint, deltaUi] of Object.entries(deltas)) {
    if (mint === quoteMintToIgnore || Math.abs(deltaUi) < 1e-12) {
      continue;
    }

    events.push({
      signature,
      slot,
      blockTime,
      side: deltaUi > 0 ? "buy" : "sell",
      tokenMint: mint,
      tokenAmountDeltaUi: Math.abs(deltaUi)
    });
  }

  return events;
}
