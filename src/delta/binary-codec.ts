import { CorruptedDeltaFrameError } from "../core/errors.js";
import { type SyncDelta } from "../core/types.js";

export const HYPERSYNC_MAGIC = 0xaa;

export const computeCRC32 = (buf: Uint8Array, start: number, end: number): number => {
  let a = 1;
  let b = 0;
  for (let i = start; i < end; i++) {
    a = (a + (buf[i] ?? 0)) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

export class BinarySyncCodec {
  public static encodeDelta(delta: SyncDelta): Buffer {
    const jsonStr = JSON.stringify(delta);
    const payloadBuf = Buffer.from(jsonStr, "utf8");

    const totalLength = 1 + 4 + payloadBuf.length + 4;
    const buffer = Buffer.allocUnsafe(totalLength);

    let offset = 0;
    buffer.writeUInt8(HYPERSYNC_MAGIC, offset++);
    buffer.writeUInt32BE(payloadBuf.length, offset);
    offset += 4;

    payloadBuf.copy(buffer, offset);
    offset += payloadBuf.length;

    const crc = computeCRC32(buffer, 0, offset);
    buffer.writeUInt32BE(crc, offset);

    return buffer;
  }

  public static decodeDelta(buffer: Buffer): SyncDelta {
    if (buffer.length < 9) {
      throw new CorruptedDeltaFrameError(0, "Frame smaller than minimum header size (9B)");
    }

    let offset = 0;
    const magic = buffer.readUInt8(offset++);
    if (magic !== HYPERSYNC_MAGIC) {
      throw new CorruptedDeltaFrameError(0, `Invalid magic byte: expected 0xAA, got 0x${magic.toString(16)}`);
    }

    const payloadLength = buffer.readUInt32BE(offset);
    offset += 4;

    if (buffer.length < 1 + 4 + payloadLength + 4) {
      throw new CorruptedDeltaFrameError(offset, `Buffer truncated: expected ${payloadLength + 9} bytes, got ${buffer.length}`);
    }

    const expectedCrc = buffer.readUInt32BE(offset + payloadLength);
    const actualCrc = computeCRC32(buffer, 0, offset + payloadLength);

    if (expectedCrc !== actualCrc) {
      throw new CorruptedDeltaFrameError(offset + payloadLength, `CRC32 checksum mismatch: expected ${expectedCrc}, got ${actualCrc}`);
    }

    const jsonStr = buffer.toString("utf8", offset, offset + payloadLength);
    try {
      return JSON.parse(jsonStr) as SyncDelta;
    } catch (err) {
      throw new CorruptedDeltaFrameError(offset, `JSON parse failure in delta payload: ${String(err)}`);
    }
  }
}
