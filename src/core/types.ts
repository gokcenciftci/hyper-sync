export type PeerId = string;

export interface LamportTimestamp {
  readonly counter: number;
  readonly peerId: PeerId;
}

export type VectorClockState = Readonly<Record<PeerId, number>>;

export type CausalRelation = "BEFORE" | "AFTER" | "CONCURRENT" | "EQUAL";

export interface LWWState<T> {
  readonly value: T;
  readonly timestamp: LamportTimestamp;
}

export interface ORSetElement<T> {
  readonly id: string;
  readonly value: T;
  readonly timestamp: LamportTimestamp;
}

export interface ORSetState<T> {
  readonly adds: readonly ORSetElement<T>[];
  readonly removes: ReadonlySet<string>;
}

export interface SequenceNode<T> {
  readonly id: string;
  readonly value: T;
  readonly originLeft: string | null;
  readonly originRight: string | null;
  readonly timestamp: LamportTimestamp;
  readonly isDeleted: boolean;
}

export type DocChange =
  | {
      readonly type: "LWW_SET";
      readonly path: string;
      readonly state: LWWState<unknown>;
    }
  | {
      readonly type: "SET_ADD";
      readonly path: string;
      readonly element: ORSetElement<unknown>;
    }
  | {
      readonly type: "SET_REMOVE";
      readonly path: string;
      readonly elementId: string;
      readonly timestamp: LamportTimestamp;
    }
  | {
      readonly type: "SEQ_INSERT";
      readonly path: string;
      readonly node: SequenceNode<unknown>;
    }
  | {
      readonly type: "SEQ_DELETE";
      readonly path: string;
      readonly nodeId: string;
      readonly timestamp: LamportTimestamp;
    };

export interface SyncDelta {
  readonly docId: string;
  readonly fromClock: VectorClockState;
  readonly toClock: VectorClockState;
  readonly changes: readonly DocChange[];
}

export interface SyncStats {
  readonly totalOperations: number;
  readonly activePeers: number;
  readonly pendingDeltasCount: number;
  readonly vectorClock: VectorClockState;
}

export interface SyncServerConfig {
  readonly port?: number | undefined;
  readonly heartbeatIntervalMs?: number | undefined;
  readonly maxPayloadBytes?: number | undefined;
}

export interface SyncClientConfig {
  readonly serverUrl: string;
  readonly peerId?: PeerId | undefined;
  readonly reconnectIntervalMs?: number | undefined;
  readonly autoSync?: boolean | undefined;
}
