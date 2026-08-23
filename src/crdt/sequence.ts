import { LamportClock } from "../clocks/lamport.js";
import { type LamportTimestamp, type SequenceNode } from "../core/types.js";

export class SequenceCRDT<T> {
  private readonly _nodes: SequenceNode<T>[] = [];
  private readonly _nodeMap: Map<string, SequenceNode<T>> = new Map();

  public get length(): number {
    let count = 0;
    for (const node of this._nodes) {
      if (!node.isDeleted) count++;
    }
    return count;
  }

  public insertAt(index: number, value: T, timestamp: LamportTimestamp): SequenceNode<T> {
    const visibleNodes = this._nodes.filter((n) => !n.isDeleted);
    const leftNode = index > 0 ? visibleNodes[index - 1] ?? null : null;
    const rightNode = index < visibleNodes.length ? visibleNodes[index] ?? null : null;

    const id = `${timestamp.peerId}:${timestamp.counter}:${Math.random().toString(36).slice(2, 8)}`;
    const newNode: SequenceNode<T> = {
      id,
      value,
      originLeft: leftNode ? leftNode.id : null,
      originRight: rightNode ? rightNode.id : null,
      timestamp,
      isDeleted: false,
    };

    this.integrate(newNode);
    return newNode;
  }

  public deleteAt(index: number): string | null {
    let visibleIndex = 0;
    for (let i = 0; i < this._nodes.length; i++) {
      const node = this._nodes[i]!;
      if (!node.isDeleted) {
        if (visibleIndex === index) {
          this._nodes[i] = { ...node, isDeleted: true };
          this._nodeMap.set(node.id, this._nodes[i]!);
          return node.id;
        }
        visibleIndex++;
      }
    }
    return null;
  }

  public deleteById(nodeId: string): boolean {
    const node = this._nodeMap.get(nodeId);
    if (!node || node.isDeleted) return false;

    const index = this._nodes.findIndex((n) => n.id === nodeId);
    if (index !== -1) {
      this._nodes[index] = { ...node, isDeleted: true };
      this._nodeMap.set(nodeId, this._nodes[index]!);
      return true;
    }
    return false;
  }

  public integrate(newNode: SequenceNode<T>): boolean {
    if (this._nodeMap.has(newNode.id)) {
      return false;
    }

    let insertIndex = 0;
    if (newNode.originLeft !== null) {
      const leftIdx = this._nodes.findIndex((n) => n.id === newNode.originLeft);
      if (leftIdx !== -1) {
        insertIndex = leftIdx + 1;
      }
    }

    while (insertIndex < this._nodes.length) {
      const current = this._nodes[insertIndex]!;

      const currentOriginIdx = current.originLeft === null
        ? -1
        : this._nodes.findIndex((n) => n.id === current.originLeft);

      const newOriginIdx = newNode.originLeft === null
        ? -1
        : this._nodes.findIndex((n) => n.id === newNode.originLeft);

      if (currentOriginIdx < newOriginIdx) {
        break;
      } else if (currentOriginIdx === newOriginIdx) {
        if (LamportClock.isAfter(newNode.timestamp, current.timestamp)) {
          break;
        } else {
          insertIndex++;
        }
      } else {
        insertIndex++;
      }
    }

    this._nodes.splice(insertIndex, 0, newNode);
    this._nodeMap.set(newNode.id, newNode);
    return true;
  }

  public toArray(): T[] {
    return this._nodes.filter((n) => !n.isDeleted).map((n) => n.value);
  }

  public toString(): string {
    return this.toArray().join("");
  }

  public getAllNodes(): readonly SequenceNode<T>[] {
    return this._nodes;
  }
}
