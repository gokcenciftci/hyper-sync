import { type CausalRelation, type PeerId, type VectorClockState } from "../core/types.js";

export class VectorClock {
  private readonly _state: Map<PeerId, number> = new Map();

  constructor(initialState?: VectorClockState | undefined) {
    if (initialState) {
      for (const [peerId, counter] of Object.entries(initialState)) {
        this._state.set(peerId, counter);
      }
    }
  }

  public get(peerId: PeerId): number {
    return this._state.get(peerId) ?? 0;
  }

  public increment(peerId: PeerId): number {
    const current = this.get(peerId);
    const next = current + 1;
    this._state.set(peerId, next);
    return next;
  }

  public set(peerId: PeerId, counter: number): void {
    this._state.set(peerId, Math.max(this.get(peerId), counter));
  }

  public merge(other: VectorClock | VectorClockState): void {
    const entries = other instanceof VectorClock ? other.entries() : Object.entries(other);
    for (const [peerId, counter] of entries) {
      this.set(peerId, counter);
    }
  }

  public clone(): VectorClock {
    return new VectorClock(this.toJSON());
  }

  public entries(): [PeerId, number][] {
    return Array.from(this._state.entries());
  }

  public toJSON(): VectorClockState {
    const record: Record<PeerId, number> = {};
    for (const [peerId, counter] of this._state.entries()) {
      record[peerId] = counter;
    }
    return Object.freeze(record);
  }

  public compare(other: VectorClock | VectorClockState): CausalRelation {
    const otherClock = other instanceof VectorClock ? other : new VectorClock(other);

    const allPeers = new Set([...this._state.keys(), ...otherClock._state.keys()]);
    let hasGreater = false;
    let hasLesser = false;

    for (const peer of allPeers) {
      const v1 = this.get(peer);
      const v2 = otherClock.get(peer);

      if (v1 > v2) hasGreater = true;
      if (v1 < v2) hasLesser = true;
    }

    if (!hasGreater && !hasLesser) return "EQUAL";
    if (hasGreater && !hasLesser) return "AFTER";
    if (!hasGreater && hasLesser) return "BEFORE";
    return "CONCURRENT";
  }

  public isDescendantOf(other: VectorClock | VectorClockState): boolean {
    const relation = this.compare(other);
    return relation === "AFTER" || relation === "EQUAL";
  }
}
