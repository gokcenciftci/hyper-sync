import { describe, it, expect } from "vitest";
import { BinarySyncCodec } from "../../src/delta/binary-codec.js";
import { type SyncDelta } from "../../src/core/types.js";

describe("BinarySyncCodec", () => {
  it("should encode and decode SyncDelta losslessly", () => {
    const delta: SyncDelta = {
      docId: "doc-123",
      fromClock: { p1: 1 },
      toClock: { p1: 2, p2: 1 },
      changes: [
        {
          type: "LWW_SET",
          path: "title",
          state: {
            value: "Hello CRDT",
            timestamp: { counter: 2, peerId: "p1" },
          },
        },
      ],
    };

    const buffer = BinarySyncCodec.encodeDelta(delta);
    expect(buffer.length).toBeGreaterThan(10);

    const decoded = BinarySyncCodec.decodeDelta(buffer);
    expect(decoded.docId).toBe(delta.docId);
    expect(decoded.toClock).toEqual(delta.toClock);
    expect(decoded.changes.length).toBe(1);
    expect((decoded.changes[0] as any).path).toBe("title");
  });

  it("should detect corrupted checksum and throw", () => {
    const delta: SyncDelta = {
      docId: "test-doc",
      fromClock: {},
      toClock: { p1: 1 },
      changes: [],
    };

    const buffer = BinarySyncCodec.encodeDelta(delta);

    buffer[6] = (buffer[6] ?? 0) ^ 0xff;

    expect(() => BinarySyncCodec.decodeDelta(buffer)).toThrow("CRC32 checksum mismatch");
  });
});
