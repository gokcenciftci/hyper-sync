import { describe, it, expect } from "vitest";
import { ORSet } from "../../src/crdt/or-set.js";

describe("ORSet (Observed-Remove Set) CRDT", () => {
  it("should add and remove elements with unique tags", () => {
    const set = new ORSet<string>();
    set.add("apple", { counter: 1, peerId: "p1" });
    set.add("banana", { counter: 2, peerId: "p1" });

    expect(set.has("apple")).toBe(true);
    expect(set.has("banana")).toBe(true);
    expect(set.has("cherry")).toBe(false);

    set.remove("apple");
    expect(set.has("apple")).toBe(false);
    expect(set.values()).toEqual(["banana"]);
  });

  it("should handle concurrent add and remove deterministically (Add-Wins)", () => {
    const setA = new ORSet<string>();
    const setB = new ORSet<string>();

    setA.add("item", { counter: 1, peerId: "p1" });
    setB.merge(setA.toJSON());

    setA.remove("item");

    setB.add("item", { counter: 2, peerId: "p2" });

    setA.merge(setB.toJSON());
    setB.merge(setA.toJSON());

    expect(setA.has("item")).toBe(true);
    expect(setB.has("item")).toBe(true);
  });
});
