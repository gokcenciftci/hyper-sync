import { bench, describe } from "vitest";
import { CRDTDoc } from "../../src/crdt/doc.js";
import { BinarySyncCodec } from "../../src/delta/binary-codec.js";
import { DeltaEngine } from "../../src/delta/engine.js";

describe("HyperSync CRDT Performance Benchmarks", () => {
  const doc = new CRDTDoc("bench-doc", "bench-peer");
  let counter = 0;

  bench("LWW Register Property Update", () => {
    doc.set("key", counter++);
  });

  bench("Sequence CRDT Character Insertion", () => {
    doc.insertText("editor", 0, "x");
  });

  bench("ORSet Element Add & Remove", () => {
    doc.addToSet("tags", `tag_${counter++}`);
  });

  const delta = DeltaEngine.calculateDelta(doc, {});
  bench("BinarySyncCodec Delta Serialization", () => {
    BinarySyncCodec.encodeDelta(delta);
  });
});
