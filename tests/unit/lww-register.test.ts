import { describe, it, expect } from "vitest";
import { LWWRegister } from "../../src/crdt/lww-register.js";

describe("LWWRegister CRDT", () => {
  it("should update value only when new timestamp is greater", () => {
    const reg = new LWWRegister("initial", { counter: 1, peerId: "node-1" });
    expect(reg.value).toBe("initial");

    const res1 = reg.set("older", { counter: 0, peerId: "node-1" });
    expect(res1).toBe(false);
    expect(reg.value).toBe("initial");

    const res2 = reg.set("newer", { counter: 2, peerId: "node-1" });
    expect(res2).toBe(true);
    expect(reg.value).toBe("newer");
  });

  it("should merge deterministically", () => {
    const regA = new LWWRegister("A", { counter: 1, peerId: "node-a" });
    const regB = new LWWRegister("B", { counter: 2, peerId: "node-b" });

    regA.merge(regB.state);
    expect(regA.value).toBe("B");
  });
});
