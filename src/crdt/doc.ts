import { LamportClock } from "../clocks/lamport.js";
import { VectorClock } from "../clocks/vector-clock.js";
import {
  type DocChange,
  type LamportTimestamp,
  type PeerId,
  type SequenceNode,
  type VectorClockState,
} from "../core/types.js";
import { LWWRegister } from "./lww-register.js";
import { ORSet } from "./or-set.js";
import { SequenceCRDT } from "./sequence.js";

export class CRDTDoc {
  public readonly docId: string;
  public readonly peerId: PeerId;

  private readonly _lamport: LamportClock;
  private readonly _vectorClock: VectorClock;

  private readonly _registers: Map<string, LWWRegister<unknown>> = new Map();
  private readonly _sets: Map<string, ORSet<unknown>> = new Map();
  private readonly _sequences: Map<string, SequenceCRDT<unknown>> = new Map();

  private readonly _changeHistory: DocChange[] = [];

  constructor(docId: string, peerId: PeerId) {
    this.docId = docId;
    this.peerId = peerId;
    this._lamport = new LamportClock(peerId);
    this._vectorClock = new VectorClock();
  }

  public get vectorClock(): VectorClockState {
    return this._vectorClock.toJSON();
  }

  public get lamportTimestamp(): LamportTimestamp {
    return this._lamport.now();
  }

  public get changeCount(): number {
    return this._changeHistory.length;
  }

  public set<T>(path: string, value: T): void {
    const ts = this._lamport.tick();
    this._vectorClock.increment(this.peerId);

    let reg = this._registers.get(path) as LWWRegister<T> | undefined;
    if (!reg) {
      reg = new LWWRegister<T>(value, ts);
      this._registers.set(path, reg as LWWRegister<unknown>);
    } else {
      reg.set(value, ts);
    }

    const change: DocChange = {
      type: "LWW_SET",
      path,
      state: reg.state,
    };
    this._changeHistory.push(change);
  }

  public get<T>(path: string): T | undefined {
    const reg = this._registers.get(path);
    return reg ? (reg.value as T) : undefined;
  }

  public getSet<T>(path: string): ORSet<T> {
    let set = this._sets.get(path) as ORSet<T> | undefined;
    if (!set) {
      set = new ORSet<T>();
      this._sets.set(path, set as ORSet<unknown>);
    }
    return set;
  }

  public addToSet<T>(path: string, value: T): void {
    const ts = this._lamport.tick();
    this._vectorClock.increment(this.peerId);

    const set = this.getSet<T>(path);
    const element = set.add(value, ts);

    const change: DocChange = {
      type: "SET_ADD",
      path,
      element,
    };
    this._changeHistory.push(change);
  }

  public removeFromSet<T>(path: string, value: T): void {
    const ts = this._lamport.tick();
    this._vectorClock.increment(this.peerId);

    const set = this.getSet<T>(path);
    const removedIds = set.remove(value);

    for (const id of removedIds) {
      const change: DocChange = {
        type: "SET_REMOVE",
        path,
        elementId: id,
        timestamp: ts,
      };
      this._changeHistory.push(change);
    }
  }

  public getText(path: string): SequenceCRDT<string> {
    let seq = this._sequences.get(path) as SequenceCRDT<string> | undefined;
    if (!seq) {
      seq = new SequenceCRDT<string>();
      this._sequences.set(path, seq as SequenceCRDT<unknown>);
    }
    return seq;
  }

  public insertText(path: string, index: number, text: string): void {
    const seq = this.getText(path);
    for (let i = 0; i < text.length; i++) {
      const ts = this._lamport.tick();
      this._vectorClock.increment(this.peerId);
      const char = text[i]!;
      const node = seq.insertAt(index + i, char, ts);

      const change: DocChange = {
        type: "SEQ_INSERT",
        path,
        node,
      };
      this._changeHistory.push(change);
    }
  }

  public deleteText(path: string, index: number, length: number = 1): void {
    const seq = this.getText(path);
    for (let i = 0; i < length; i++) {
      const ts = this._lamport.tick();
      this._vectorClock.increment(this.peerId);
      const deletedId = seq.deleteAt(index);

      if (deletedId) {
        const change: DocChange = {
          type: "SEQ_DELETE",
          path,
          nodeId: deletedId,
          timestamp: ts,
        };
        this._changeHistory.push(change);
      }
    }
  }

  public applyChange(change: DocChange): void {
    switch (change.type) {
      case "LWW_SET": {
        this._lamport.update(change.state.timestamp);
        this._vectorClock.set(change.state.timestamp.peerId, change.state.timestamp.counter);

        let reg = this._registers.get(change.path);
        if (!reg) {
          reg = new LWWRegister(change.state.value, change.state.timestamp);
          this._registers.set(change.path, reg);
        } else {
          reg.merge(change.state);
        }
        this._changeHistory.push(change);
        break;
      }
      case "SET_ADD": {
        this._lamport.update(change.element.timestamp);
        this._vectorClock.set(change.element.timestamp.peerId, change.element.timestamp.counter);

        const set = this.getSet(change.path);
        set.merge({ adds: [change.element], removes: new Set() });
        this._changeHistory.push(change);
        break;
      }
      case "SET_REMOVE": {
        this._lamport.update(change.timestamp);
        this._vectorClock.set(change.timestamp.peerId, change.timestamp.counter);

        const set = this.getSet(change.path);
        set.merge({ adds: [], removes: new Set([change.elementId]) });
        this._changeHistory.push(change);
        break;
      }
      case "SEQ_INSERT": {
        this._lamport.update(change.node.timestamp);
        this._vectorClock.set(change.node.timestamp.peerId, change.node.timestamp.counter);

        const seq = this.getText(change.path);
        seq.integrate(change.node as SequenceNode<string>);
        this._changeHistory.push(change);
        break;
      }
      case "SEQ_DELETE": {
        this._lamport.update(change.timestamp);
        this._vectorClock.set(change.timestamp.peerId, change.timestamp.counter);

        const seq = this.getText(change.path);
        seq.deleteById(change.nodeId);
        this._changeHistory.push(change);
        break;
      }
    }
  }

  public applyChanges(changes: readonly DocChange[]): void {
    for (const c of changes) {
      this.applyChange(c);
    }
  }

  public getChangesSince(remoteClock: VectorClockState): DocChange[] {
    const deltaChanges: DocChange[] = [];

    for (const change of this._changeHistory) {
      const ts = this.extractTimestamp(change);
      const remoteCounter = remoteClock[ts.peerId] ?? 0;
      if (ts.counter > remoteCounter) {
        deltaChanges.push(change);
      }
    }

    return deltaChanges;
  }

  public toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    const sortedRegKeys = Array.from(this._registers.keys()).sort();
    for (const path of sortedRegKeys) {
      obj[path] = this._registers.get(path)!.value;
    }

    const sortedSetKeys = Array.from(this._sets.keys()).sort();
    for (const path of sortedSetKeys) {
      obj[path] = this._sets.get(path)!.values();
    }

    const sortedSeqKeys = Array.from(this._sequences.keys()).sort();
    for (const path of sortedSeqKeys) {
      obj[path] = this._sequences.get(path)!.toString();
    }

    return obj;
  }

  private extractTimestamp(change: DocChange): LamportTimestamp {
    switch (change.type) {
      case "LWW_SET":
        return change.state.timestamp;
      case "SET_ADD":
        return change.element.timestamp;
      case "SET_REMOVE":
      case "SEQ_DELETE":
        return change.timestamp;
      case "SEQ_INSERT":
        return change.node.timestamp;
    }
  }
}
