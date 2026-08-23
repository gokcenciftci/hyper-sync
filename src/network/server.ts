import { WebSocketServer, WebSocket } from "ws";
import { CRDTDoc } from "../crdt/doc.js";
import { DeltaEngine } from "../delta/engine.js";
import { type SyncServerConfig } from "../core/types.js";
import { type SyncMessage } from "./ws-protocol.js";

interface PeerConnection {
  readonly peerId: string;
  readonly docId: string;
  readonly socket: WebSocket;
}

export class SyncServer {
  public readonly port: number;
  private readonly _docs: Map<string, CRDTDoc> = new Map();
  private readonly _rooms: Map<string, Set<PeerConnection>> = new Map();
  private _wss: WebSocketServer | null = null;

  constructor(config?: SyncServerConfig | undefined) {
    this.port = config?.port ?? 8080;
  }

  public getDoc(docId: string): CRDTDoc {
    let doc = this._docs.get(docId);
    if (!doc) {
      doc = new CRDTDoc(docId, "server-hub");
      this._docs.set(docId, doc);
    }
    return doc;
  }

  public getConnectedPeersCount(docId: string): number {
    return this._rooms.get(docId)?.size ?? 0;
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this._wss = new WebSocketServer({ port: this.port }, () => {
          const address = this._wss?.address();
          const actualPort = typeof address === "object" && address ? address.port : this.port;
          this.setupConnectionHandlers();
          resolve(actualPort);
        });
        this._wss.on("error", (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this._wss) {
        this._wss.close(() => {
          this._wss = null;
          this._rooms.clear();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private setupConnectionHandlers(): void {
    if (!this._wss) return;

    this._wss.on("connection", (socket: WebSocket) => {
      let currentConn: PeerConnection | null = null;

      socket.on("message", (raw: Buffer | string) => {
        try {
          const msg = JSON.parse(raw.toString()) as SyncMessage;

          switch (msg.type) {
            case "HANDSHAKE": {
              currentConn = {
                peerId: msg.peerId,
                docId: msg.docId,
                socket,
              };

              let room = this._rooms.get(msg.docId);
              if (!room) {
                room = new Set();
                this._rooms.set(msg.docId, room);
              }
              room.add(currentConn);

              const doc = this.getDoc(msg.docId);

              const deltaForClient = DeltaEngine.calculateDelta(doc, msg.clock);
              if (deltaForClient.changes.length > 0) {
                const syncMsg: SyncMessage = {
                  type: "SYNC_DELTA",
                  delta: deltaForClient,
                };
                socket.send(JSON.stringify(syncMsg));
              }
              break;
            }
            case "SYNC_DELTA": {
              if (!currentConn) return;
              const doc = this.getDoc(msg.delta.docId);

              DeltaEngine.applyDelta(doc, msg.delta);

              const room = this._rooms.get(msg.delta.docId);
              if (room) {
                const broadcastPayload = JSON.stringify(msg);
                for (const peer of room) {
                  if (peer.socket !== socket && peer.socket.readyState === WebSocket.OPEN) {
                    peer.socket.send(broadcastPayload);
                  }
                }
              }
              break;
            }
          }
        } catch (err) {
          console.error("[SyncServer] Error handling message:", err);
        }
      });

      socket.on("close", () => {
        if (currentConn) {
          const room = this._rooms.get(currentConn.docId);
          if (room) {
            room.delete(currentConn);
            if (room.size === 0) {
              this._rooms.delete(currentConn.docId);
            }
          }
        }
      });
    });
  }
}
