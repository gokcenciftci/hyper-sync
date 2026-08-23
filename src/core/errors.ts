export abstract class HyperSyncError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: number;
  public override readonly cause?: unknown | undefined;

  constructor(message: string, cause?: unknown | undefined) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CorruptedDeltaFrameError extends HyperSyncError {
  public readonly code = "CORRUPTED_DELTA_FRAME" as const;
  public readonly offset: number;

  constructor(offset: number, reason: string) {
    super(`Corrupted sync delta binary frame at offset ${offset}: ${reason}`);
    this.offset = offset;
  }
}

export class NetworkSyncError extends HyperSyncError {
  public readonly code = "NETWORK_SYNC_FAILED" as const;
  public readonly peerId: string;

  constructor(peerId: string, message: string, cause?: unknown | undefined) {
    super(`Network synchronization failed with peer '${peerId}': ${message}`, cause);
    this.peerId = peerId;
  }
}

export class InvalidPathError extends HyperSyncError {
  public readonly code = "INVALID_DOCUMENT_PATH" as const;
  public readonly path: string;

  constructor(path: string, reason: string) {
    super(`Invalid CRDT document path '${path}': ${reason}`);
    this.path = path;
  }
}

export class PeerConnectionError extends HyperSyncError {
  public readonly code = "PEER_CONNECTION_ERROR" as const;
  public readonly serverUrl: string;

  constructor(serverUrl: string, message: string, cause?: unknown | undefined) {
    super(`WebSocket connection failed to server '${serverUrl}': ${message}`, cause);
    this.serverUrl = serverUrl;
  }
}
