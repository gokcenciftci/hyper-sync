import { describe, it, expect } from "vitest";
import { VectorClock } from "../../src/clocks/vector-clock.js";

describe("VectorClock", () => {
  it("should initialize and increment peer counters", () => {
    const vc = new VectorClock();
    expect(vc.get("p1")).toBe(0);

    vc.increment("p1");
    vc.increment("p1");
    vc.increment("p2");

    expect(vc.get("p1")).toBe(2);
    expect(vc.get("p2")).toBe(1);
  });

  it("should merge two vector clocks by element-wise maximum", () => {
    const vc1 = new VectorClock({ p1: 2, p2: 5 });
    const vc2 = new VectorClock({ p1: 4, p2: 3, p3: 1 });

    vc1.merge(vc2);

    expect(vc1.get("p1")).toBe(4);
    expect(vc1.get("p2")).toBe(5);
    expect(vc1.get("p3")).toBe(1);
  });

  it("should determine causal relationship (BEFORE, AFTER, EQUAL, CONCURRENT)", () => {
    const vc1 = new VectorClock({ p1: 1, p2: 1 });
    const vc2 = new VectorClock({ p1: 1, p2: 1 });
    expect(vc1.compare(vc2)).toBe("EQUAL");

    const vcAfter = new VectorClock({ p1: 2, p2: 1 });
    expect(vcAfter.compare(vc1)).toBe("AFTER");
    expect(vc1.compare(vcAfter)).toBe("BEFORE");

    const vcConcurrent = new VectorClock({ p1: 0, p2: 2 });
    expect(vcAfter.compare(vcConcurrent)).toBe("CONCURRENT");
  });

  it("should clone correctly", () => {
    const vc = new VectorClock({ p1: 10 });
    const cloned = vc.clone();
    expect(cloned.get("p1")).toBe(10);
    cloned.increment("p1");
    expect(vc.get("p1")).toBe(10);
    expect(cloned.get("p1")).toBe(11);
  });
});
