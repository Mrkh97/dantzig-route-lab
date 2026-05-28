export class SeededRandom {
  private state: number;

  constructor(seed: number | null = null) {
    this.state = seed === null ? Date.now() >>> 0 : seed >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  random(): number {
    this.state += 0x6d2b79f5;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }

  shuffle<T>(items: T[]): void {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
  }

  sample<T>(items: readonly T[], count: number): T[] {
    if (count > items.length) {
      throw new Error("Sample count cannot exceed item count.");
    }

    const copy = [...items];
    this.shuffle(copy);
    return copy.slice(0, count);
  }
}
