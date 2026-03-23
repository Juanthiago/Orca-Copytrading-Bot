import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

export function keypairFromBase58(base58Secret: string): Keypair {
  const bytes = bs58.decode(base58Secret);
  return Keypair.fromSecretKey(bytes);
}
