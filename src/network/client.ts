import { WebSocket } from "ws";
import { CRDTDoc } from "../crdt/doc.js";
import { DeltaEngine } from "../delta/engine.js";
import { type PeerId, type SyncClientConfig } from "../core/types.js";
import { type SyncMessage } from "./ws-protocol.js";

export class SyncClient {
  public readonly serverUrl: string;
  public readonly doc: CRDTDoc;
  public readonly peerId: PeerId;

  private _ws: WebSocket | null = null;
  private _isConnected: boolean = false;
  private _isDestroyed: boolean = false;

  constructor(docId: string, config: SyncClientConfig) {
    this.serverUrl = config.serverUrl;
    this.peerId = config.peerId ?? `peer-${Math.random().toString(36).slice(2, 7)}`;
    this.doc = new CRDTDoc(docId, this.peerId);
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._isDestroyed) return reject(new Error("Client is destroyed"));

      try {
        this._ws = new WebSocket(this.serverUrl);

        this._ws.on("open", () => {
          this._isConnected = true;

          const handshake: SyncMessage = {
            type: "HANDSHAKE",
            peerId: this.peerId,
            docId: this.doc.docId,
            clock: this.doc.vectorClock,
          };
          this._ws?.send(JSON.stringify(handshake));

          const delta = DeltaEngine.calculateDelta(this.doc, {});
          if (delta.changes.length > 0) {
            const syncMsg: SyncMessage = {
              type: "SYNC_DELTA",
              delta,
            };
            this._ws?.send(JSON.stringify(syncMsg));
          }

          resolve();
        });

        this._ws.on("message", (raw: Buffer | string) => {
          try {
            const msg = JSON.parse(raw.toString()) as SyncMessage;
            if (msg.type === "SYNC_DELTA" && msg.delta.docId === this.doc.docId) {
              DeltaEngine.applyDelta(this.doc, msg.delta);
            }
          } catch (err) {
            console.error("[SyncClient] Message handling error:", err);
          }
        });

        this._ws.on("close", () => {
          this._isConnected = false;
        });

        this._ws.on("error", (err) => {
          if (!this._isConnected) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public sync(): void {
    if (!this._isConnected || !this._ws || this._ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const delta = DeltaEngine.calculateDelta(this.doc, {});
    if (delta.changes.length > 0) {
      const msg: SyncMessage = {
        type: "SYNC_DELTA",
        delta,
      };
      this._ws.send(JSON.stringify(msg));
    }
  }

  public disconnect(): void {
    this._isDestroyed = true;
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._isConnected = false;
  }
}
