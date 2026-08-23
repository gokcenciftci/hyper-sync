import { describe, it, expect } from "vitest";
import { SequenceCRDT } from "../../src/crdt/sequence.js";

describe("SequenceCRDT (RGA Text / List)", () => {
  it("should insert and delete characters at index", () => {
    const seq = new SequenceCRDT<string>();
    seq.insertAt(0, "H", { counter: 1, peerId: "p1" });
    seq.insertAt(1, "e", { counter: 2, peerId: "p1" });
    seq.insertAt(2, "y", { counter: 3, peerId: "p1" });

    expect(seq.toString()).toBe("Hey");
    expect(seq.length).toBe(3);

    seq.deleteAt(1);
    expect(seq.toString()).toBe("Hy");
    expect(seq.length).toBe(2);
  });

  it("should merge concurrent insertions at same position deterministically", () => {
    const seqA = new SequenceCRDT<string>();
    const seqB = new SequenceCRDT<string>();

    const nodeA = seqA.insertAt(0, "A", { counter: 1, peerId: "p1" });
    seqB.integrate(nodeA);

    const nodeB = seqA.insertAt(1, "B", { counter: 2, peerId: "alice" });

    const nodeC = seqB.insertAt(1, "C", { counter: 3, peerId: "bob" });

    seqA.integrate(nodeC);
    seqB.integrate(nodeB);

    expect(seqA.toString()).toBe(seqB.toString());
  });
});
