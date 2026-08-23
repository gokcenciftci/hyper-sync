import { CRDTDoc } from "./crdt/doc.js";
import { DeltaEngine } from "./delta/engine.js";
import { type PeerId, type SyncStats } from "./core/types.js";

export class HyperSync {
  public readonly peerId: PeerId;
  private readonly _docs: Map<string, CRDTDoc> = new Map();

  constructor(peerId?: PeerId | undefined) {
    this.peerId = peerId ?? `node-${Math.random().toString(36).slice(2, 7)}`;
  }

  public getDoc(docId: string): CRDTDoc {
    let doc = this._docs.get(docId);
    if (!doc) {
      doc = new CRDTDoc(docId, this.peerId);
      this._docs.set(docId, doc);
    }
    return doc;
  }

  public syncDirect(docA: CRDTDoc, docB: CRDTDoc): { deltasAB: number; deltasBA: number } {
    const deltaAB = DeltaEngine.calculateDelta(docA, docB.vectorClock);
    const deltaBA = DeltaEngine.calculateDelta(docB, docA.vectorClock);

    DeltaEngine.applyDelta(docB, deltaAB);
    DeltaEngine.applyDelta(docA, deltaBA);

    return {
      deltasAB: deltaAB.changes.length,
      deltasBA: deltaBA.changes.length,
    };
  }

  public getStats(docId: string): SyncStats {
    const doc = this.getDoc(docId);
    const clock = doc.vectorClock;

    return {
      totalOperations: doc.changeCount,
      activePeers: Object.keys(clock).length,
      pendingDeltasCount: 0,
      vectorClock: clock,
    };
  }
}
