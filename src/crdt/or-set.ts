import { type LamportTimestamp, type ORSetElement, type ORSetState } from "../core/types.js";

export class ORSet<T> {
  private readonly _adds: Map<string, ORSetElement<T>> = new Map();
  private readonly _removes: Set<string> = new Set();

  constructor(initialState?: ORSetState<T> | undefined) {
    if (initialState) {
      for (const el of initialState.adds) {
        this._adds.set(el.id, el);
      }
      for (const id of initialState.removes) {
        this._removes.add(id);
      }
    }
  }

  public add(value: T, timestamp: LamportTimestamp): ORSetElement<T> {
    const id = `${timestamp.peerId}:${timestamp.counter}:${Math.random().toString(36).slice(2, 8)}`;
    const element: ORSetElement<T> = { id, value, timestamp };
    this._adds.set(id, element);
    return element;
  }

  public remove(value: T): string[] {
    const removedIds: string[] = [];
    for (const [id, element] of this._adds.entries()) {
      if (element.value === value && !this._removes.has(id)) {
        this._removes.add(id);
        removedIds.push(id);
      }
    }
    return removedIds;
  }

  public has(value: T): boolean {
    for (const [id, element] of this._adds.entries()) {
      if (element.value === value && !this._removes.has(id)) {
        return true;
      }
    }
    return false;
  }

  public values(): T[] {
    const activeValues: T[] = [];
    const seen = new Set<T>();

    for (const [id, element] of this._adds.entries()) {
      if (!this._removes.has(id) && !seen.has(element.value)) {
        activeValues.push(element.value);
        seen.add(element.value);
      }
    }

    return activeValues.sort((a, b) => String(a).localeCompare(String(b)));
  }

  public merge(remoteState: ORSetState<T>): void {
    for (const el of remoteState.adds) {
      this._adds.set(el.id, el);
    }
    for (const id of remoteState.removes) {
      this._removes.add(id);
    }
  }

  public toJSON(): ORSetState<T> {
    return {
      adds: Array.from(this._adds.values()),
      removes: new Set(this._removes),
    };
  }
}
