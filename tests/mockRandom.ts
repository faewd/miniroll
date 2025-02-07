import { RandomProvider } from "../dist/miniroll";

export type MockRandom = {
  prime(...nums: number[]): void;
  clear(): void;
  provider: RandomProvider;
};

export function createMockRandom() {
  const next: number[] = [];
  return {
    prime(...nums: number[]) {
      next.push(...nums);
    },
    clear() {
      next.splice(0, next.length);
    },
    provider() {
      const value = next.shift();
      if (value !== undefined) return value;
      throw new Error("Mock random has not been sufficiently primed.");
    },
  };
}
