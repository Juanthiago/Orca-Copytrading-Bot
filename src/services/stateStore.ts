import { BotState, DetectedTradeEvent, Position } from "../types.js";
import { readJsonFile, writeJsonFile } from "../utils/fs.js";

const EMPTY_STATE: BotState = {
  processedSignatures: [],
  positions: {},
  eventHistory: []
};

export class StateStore {
  constructor(private readonly statePath: string) {}

  async load(): Promise<BotState> {
    return readJsonFile<BotState>(this.statePath, EMPTY_STATE);
  }

  async save(state: BotState): Promise<void> {
    const compacted: BotState = {
      processedSignatures: state.processedSignatures.slice(-5_000),
      positions: state.positions,
      eventHistory: state.eventHistory.slice(-1_000)
    };
    await writeJsonFile(this.statePath, compacted);
  }

  async upsertPosition(position: Position): Promise<void> {
    const state = await this.load();
    state.positions[position.mint] = position;
    await this.save(state);
  }

  async deletePosition(mint: string): Promise<void> {
    const state = await this.load();
    delete state.positions[mint];
    await this.save(state);
  }

  async appendEvent(event: DetectedTradeEvent): Promise<void> {
    const state = await this.load();
    state.eventHistory.push(event);
    await this.save(state);
  }

  async markProcessedSignature(signature: string): Promise<void> {
    const state = await this.load();
    if (!state.processedSignatures.includes(signature)) {
      state.processedSignatures.push(signature);
    }
    await this.save(state);
  }
}
