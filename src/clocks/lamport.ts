import { type LamportTimestamp, type PeerId } from "../core/types.js";

export class LamportClock {
  public readonly peerId: PeerId;
  private _counter: number;

  constructor(peerId: PeerId, initialCounter: number = 0) {
    this.peerId = peerId;
    this._counter = initialCounter;
  }

  public get counter(): number {
    return this._counter;
  }

  public now(): LamportTimestamp {
    return {
      counter: this._counter,
      peerId: this.peerId,
    };
  }

  public tick(): LamportTimestamp {
    this._counter += 1;
    return this.now();
  }

  public update(remote: LamportTimestamp): LamportTimestamp {
    this._counter = Math.max(this._counter, remote.counter) + 1;
    return this.now();
  }

  public static compare(a: LamportTimestamp, b: LamportTimestamp): number {
    if (a.counter !== b.counter) {
      return a.counter - b.counter;
    }
    return a.peerId.localeCompare(b.peerId);
  }

  public static isAfter(a: LamportTimestamp, b: LamportTimestamp): boolean {
    return LamportClock.compare(a, b) > 0;
  }
}
