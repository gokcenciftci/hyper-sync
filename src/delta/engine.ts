import { type CRDTDoc } from "../crdt/doc.js";
import { type SyncDelta, type VectorClockState } from "../core/types.js";

export class DeltaEngine {
  public static calculateDelta(doc: CRDTDoc, remoteClock: VectorClockState): SyncDelta {
    const changes = doc.getChangesSince(remoteClock);
    return {
      docId: doc.docId,
      fromClock: remoteClock,
      toClock: doc.vectorClock,
      changes,
    };
  }

  public static applyDelta(doc: CRDTDoc, delta: SyncDelta): void {
    if (delta.docId !== doc.docId) {
      throw new Error(`Delta docId '${delta.docId}' does not match document '${doc.docId}'`);
    }
    doc.applyChanges(delta.changes);
  }
}
