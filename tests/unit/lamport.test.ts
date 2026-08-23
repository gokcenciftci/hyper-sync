import { describe, it, expect } from "vitest";
import { LamportClock } from "../../src/clocks/lamport.js";

describe("LamportClock", () => {
  it("should tick monotonically", () => {
    const clock = new LamportClock("alice");
    const ts1 = clock.tick();
    const ts2 = clock.tick();

    expect(ts1.counter).toBe(1);
    expect(ts2.counter).toBe(2);
    expect(ts1.peerId).toBe("alice");
  });

  it("should update on remote timestamp", () => {
    const clock = new LamportClock("bob", 2);
    const remote = { counter: 10, peerId: "alice" };

    const updated = clock.update(remote);
    expect(updated.counter).toBe(11);
    expect(updated.peerId).toBe("bob");
  });

  it("should tie-break by peerId when counters are equal", () => {
    const tsA = { counter: 5, peerId: "alice" };
    const tsB = { counter: 5, peerId: "bob" };

    expect(LamportClock.compare(tsA, tsB)).toBeLessThan(0);
    expect(LamportClock.isAfter(tsB, tsA)).toBe(true);
  });
});
