import { describe, it, expect } from "vitest";
import { CRDTDoc } from "../../src/crdt/doc.js";
import { DeltaEngine } from "../../src/delta/engine.js";

describe("CRDT Mathematical Convergence & Eventual Consistency Fuzzing", () => {
  it("should converge 5 partitioned peers to identical state after 1,000 randomized concurrent operations", () => {
    const peerCount = 5;
    const peers = Array.from({ length: peerCount }, (_, i) => new CRDTDoc("fuzz-doc", `peer-${i + 1}`));

    for (let op = 0; op < 1000; op++) {
      const peer = peers[op % peerCount]!;
      const action = op % 3;

      if (action === 0) {

        peer.set(`field_${op % 5}`, `value_${op}`);
      } else if (action === 1) {

        if (op % 2 === 0) {
          peer.addToSet("tags", `tag_${op % 10}`);
        } else {
          peer.removeFromSet("tags", `tag_${(op - 1) % 10}`);
        }
      } else {

        const text = String.fromCharCode(65 + (op % 26));
        const currentLen = peer.getText("body").length;
        const insertIdx = currentLen > 0 ? (op * 7) % currentLen : 0;
        peer.insertText("body", insertIdx, text);
      }

      if (op % 50 === 0) {
        const pA = peers[(op * 3) % peerCount]!;
        const pB = peers[(op * 7) % peerCount]!;
        const delta = DeltaEngine.calculateDelta(pA, pB.vectorClock);
        DeltaEngine.applyDelta(pB, delta);
      }
    }

    for (let i = 0; i < peerCount; i++) {
      for (let j = 0; j < peerCount; j++) {
        if (i !== j) {
          const delta = DeltaEngine.calculateDelta(peers[i]!, peers[j]!.vectorClock);
          DeltaEngine.applyDelta(peers[j]!, delta);
        }
      }
    }

    const referenceJSON = JSON.stringify(peers[0]!.toJSON());
    const referenceText = peers[0]!.getText("body").toString();

    for (let i = 1; i < peerCount; i++) {
      const peerJSON = JSON.stringify(peers[i]!.toJSON());
      const peerText = peers[i]!.getText("body").toString();

      expect(peerJSON).toBe(referenceJSON);
      expect(peerText).toBe(referenceText);
    }
  });
});
