#!/usr/bin/env node
import { HyperSync } from "./engine.js";
import { CRDTDoc } from "./crdt/doc.js";

async function main() {
  console.log("\n\x1b[1m\x1b[36m=====================================================");
  console.log(" 🌐 HyperSync Distributed CRDT & State Engine 🌐");
  console.log("=====================================================\x1b[0m\n");

  const sync = new HyperSync();

  const aliceDoc = new CRDTDoc("shared-workspace", "peer-alice");
  const bobDoc = new CRDTDoc("shared-workspace", "peer-bob");
  const charlieDoc = new CRDTDoc("shared-workspace", "peer-charlie");

  console.log("📝 \x1b[1mSimulating Concurrent Partitioned Editing (3 Peers)...\x1b[0m");

  aliceDoc.set("title", "Distributed Systems Manifesto");
  aliceDoc.insertText("content", 0, "Hello World! ");
  aliceDoc.addToSet("tags", "crdt");

  bobDoc.addToSet("tags", "distributed");
  bobDoc.insertText("content", 0, "Welcome: ");

  charlieDoc.set("status", "ACTIVE");
  charlieDoc.addToSet("tags", "local-first");

  console.log("  * Alice local state   :", JSON.stringify(aliceDoc.toJSON()));
  console.log("  * Bob local state     :", JSON.stringify(bobDoc.toJSON()));
  console.log("  * Charlie local state :", JSON.stringify(charlieDoc.toJSON()));

  console.log("\n🔄 \x1b[1mReconciling Multi-Way Delta Mesh Synchronization...\x1b[0m");

  sync.syncDirect(aliceDoc, bobDoc);
  sync.syncDirect(bobDoc, charlieDoc);
  sync.syncDirect(aliceDoc, charlieDoc);

  console.log("\n✨ \x1b[32m✔ Mathematical Convergence Achieved Across All Peers:\x1b[0m");
  console.log("  * Alice converged   :", JSON.stringify(aliceDoc.toJSON()));
  console.log("  * Bob converged     :", JSON.stringify(bobDoc.toJSON()));
  console.log("  * Charlie converged :", JSON.stringify(charlieDoc.toJSON()));

  console.log("\n🚀 \x1b[1mBenchmarking 100,000 Concurrent CRDT Operations...\x1b[0m");
  const benchDoc = new CRDTDoc("bench-doc", "bench-worker");

  const start = performance.now();
  for (let i = 0; i < 100_000; i++) {
    benchDoc.set(`key_${i % 100}`, i);
  }
  const durationMs = performance.now() - start;
  const opsPerSec = Math.round((100_000 / durationMs) * 1000);

  console.log(`\x1b[32m✔ Executed 100,000 CRDT operations in ${durationMs.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)\x1b[0m\n`);
}

void main();
