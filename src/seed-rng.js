export function hashSeed(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class SeededRng {
  constructor(seed) { this.state = hashSeed(seed) || 0x9e3779b9; }
  next() {
    let value = this.state += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  integer(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  choice(values) { return values[Math.floor(this.next() * values.length)]; }
  weighted(values, weights) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let point = this.next() * total;
    for (let index = 0; index < values.length; index += 1) {
      point -= weights[index];
      if (point <= 0) return values[index];
    }
    return values.at(-1);
  }
}
