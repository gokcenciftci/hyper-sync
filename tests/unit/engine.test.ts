import { describe, it, expect } from "vitest";
import { HyperSync } from "../../src/engine.js";
import { CRDTDoc } from "../../src/crdt/doc.js";

describe("HyperSync Engine Orchestrator", () => {
  it("should create documents and manage stats", () => {
    const sync = new HyperSync("test-node");
    expect(sync.peerId).toBe("test-node");

    const doc = sync.getDoc("doc-1");
    expect(doc.docId).toBe("doc-1");
    expect(doc.peerId).toBe("test-node");

    doc.set("key", "val");
    const stats = sync.getStats("doc-1");
    expect(stats.totalOperations).toBe(1);
    expect(stats.activePeers).toBe(1);
  });

  it("should synchronize two documents directly via syncDirect", () => {
    const sync = new HyperSync();
    const docA = new CRDTDoc("doc-ab", "peer-a");
    const docB = new CRDTDoc("doc-ab", "peer-b");

    docA.set("title", "Hello");
    docB.set("status", "ACTIVE");

    const syncRes = sync.syncDirect(docA, docB);
    expect(syncRes.deltasAB).toBe(1);
    expect(syncRes.deltasBA).toBe(1);

    expect(docA.get("status")).toBe("ACTIVE");
    expect(docB.get("title")).toBe("Hello");
  });
});
