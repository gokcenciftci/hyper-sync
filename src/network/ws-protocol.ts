import { type PeerId, type SyncDelta, type VectorClockState } from "../core/types.js";

export type SyncMessage =
  | {
      readonly type: "HANDSHAKE";
      readonly peerId: PeerId;
      readonly docId: string;
      readonly clock: VectorClockState;
    }
  | {
      readonly type: "SYNC_DELTA";
      readonly delta: SyncDelta;
    }
  | {
      readonly type: "CLOCK_PING";
      readonly peerId: PeerId;
      readonly docId: string;
      readonly clock: VectorClockState;
    }
  | {
      readonly type: "ACK";
      readonly docId: string;
      readonly peerId: PeerId;
      readonly toClock: VectorClockState;
    };
