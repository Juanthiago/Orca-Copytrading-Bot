import { Commitment, Connection } from "@solana/web3.js";
import { config } from "../config.js";

export function createConnection(commitment: Commitment = "confirmed"): Connection {
  return new Connection(config.rpcUrl, {
    commitment,
    wsEndpoint: config.wsUrl
  });
}
