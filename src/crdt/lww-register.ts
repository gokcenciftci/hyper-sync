import { LamportClock } from "../clocks/lamport.js";
import { type LamportTimestamp, type LWWState } from "../core/types.js";

export class LWWRegister<T> {
  private _state: LWWState<T>;

  constructor(initialValue: T, timestamp: LamportTimestamp) {
    this._state = {
      value: initialValue,
      timestamp,
    };
  }

  public get value(): T {
    return this._state.value;
  }

  public get timestamp(): LamportTimestamp {
    return this._state.timestamp;
  }

  public get state(): LWWState<T> {
    return this._state;
  }

  public set(newValue: T, timestamp: LamportTimestamp): boolean {
    if (LamportClock.isAfter(timestamp, this._state.timestamp)) {
      this._state = { value: newValue, timestamp };
      return true;
    }
    return false;
  }

  public merge(remoteState: LWWState<T>): boolean {
    return this.set(remoteState.value, remoteState.timestamp);
  }
}
