import { describe, it, expect } from "vitest";
import {
  CorruptedDeltaFrameError,
  NetworkSyncError,
  InvalidPathError,
  PeerConnectionError,
} from "../../src/core/errors.js";
import { ok, err, isOk, isErr, map, mapErr, flatMap, unwrapOr, match } from "../../src/core/result.js";

describe("Result Monad & Typed Errors", () => {
  it("should handle Result monad transformations", () => {
    const r = ok(10);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    expect(unwrapOr(r, 0)).toBe(10);

    const mapped = map(r, (x) => x * 3);
    expect(unwrapOr(mapped, 0)).toBe(30);

    const rErr = err("fail");
    expect(isErr(rErr)).toBe(true);
    expect(unwrapOr(rErr, 50)).toBe(50);

    const mappedErr = mapErr(rErr, (e) => `err: ${e}`);
    expect(mappedErr.isErr).toBe(true);
    if (mappedErr.isErr) {
      expect(mappedErr.error).toBe("err: fail");
    }

    const flatMapped = flatMap(r, (v) => ok(v + 5));
    expect(unwrapOr(flatMapped, 0)).toBe(15);

    const m = match(r, {
      onOk: (v) => `value: ${v}`,
      onErr: (e) => `error: ${e}`,
    });
    expect(m).toBe("value: 10");
  });

  it("should instantiate typed domain errors correctly", () => {
    const frameErr = new CorruptedDeltaFrameError(12, "Bad format");
    expect(frameErr.code).toBe("CORRUPTED_DELTA_FRAME");

    const netErr = new NetworkSyncError("p1", "Disconnected");
    expect(netErr.code).toBe("NETWORK_SYNC_FAILED");

    const pathErr = new InvalidPathError("x/y", "Invalid segment");
    expect(pathErr.code).toBe("INVALID_DOCUMENT_PATH");

    const connErr = new PeerConnectionError("ws://localhost", "Refused");
    expect(connErr.code).toBe("PEER_CONNECTION_ERROR");
  });
});
