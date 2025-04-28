import { expect, test, describe, beforeEach, beforeAll } from "vitest";
import {
  createRoller,
  KeepDropRollEvalResult,
  Roller,
  RollEvalResult,
} from "../src/index";
import { createMockRandom, MockRandom } from "./mockRandom";

describe("roll", () => {
  let mockRandom: MockRandom;
  let roll: Roller;

  beforeAll(() => {
    mockRandom = createMockRandom();
    roll = createRoller({ randomProvider: mockRandom.provider });
  });

  beforeEach(() => {
    mockRandom.clear();
  });

  test("one die", () => {
    mockRandom.prime(4);
    const res = roll("1d6");
    expect(res.result).toBe(4);
    expect(res.calculation.kind).toBe("roll");
    const rollResult = res.calculation as RollEvalResult;
    expect(rollResult.rolls.length).toBe(1);
  });

  test("one die implicitly", () => {
    mockRandom.prime(10);
    const res = roll("d20");
    expect(res.result).toBe(10);
    expect(res.calculation.kind).toBe("roll");
    const rollResult = res.calculation as RollEvalResult;
    expect(rollResult.rolls.length).toBe(1);
  });

  test("multiple dice", () => {
    mockRandom.prime(1, 2, 3);
    const res = roll("3d6");
    expect(res.result).toBe(6);
    expect(res.calculation.kind).toBe("roll");
    const rollResult = res.calculation as RollEvalResult;
    expect(rollResult.rolls.length).toBe(3);
  });

  describe("exploding dice", () => {
    test("one exploding die with one reroll", () => {
      mockRandom.prime(4, 3);
      const res = roll("1d4!");
      expect(res.result).toBe(7);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls.length).toBe(2);
      expect(rollResult.intermediateText).toBe("[(**4** + 3)]");
    });

    test("one exploding die with multiple rerolls", () => {
      mockRandom.prime(4, 4, 4, 1);
      const res = roll("1d4!");
      expect(res.result).toBe(13);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls.length).toBe(4);
      expect(rollResult.intermediateText).toBe("[(**4** + 4 + 4 + 1)]");
    });

    test("multiple exploding dice with one reroll for one die", () => {
      mockRandom.prime(2, 2, 6, 5, 2);
      const res = roll("4d6!");
      expect(res.result).toBe(17);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls.length).toBe(5);
      expect(rollResult.intermediateText).toBe("[2 + 2 + (**6** + 5) + 2]");
    });

    test("multiple exploding dice with one reroll each", () => {
      mockRandom.prime(6, 5, 6, 4, 6, 3);
      const res = roll("3d6!");
      expect(res.result).toBe(30);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls.length).toBe(6);
      expect(rollResult.intermediateText).toBe(
        "[(**6** + 5) + (**6** + 4) + (**6** + 3)]"
      );
    });

    test("multiple exploding dice with multiple rerolls for one die", () => {
      mockRandom.prime(1, 4, 4, 4, 3);
      const res = roll("2d4!");
      expect(res.result).toBe(16);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls.length).toBe(5);
      expect(rollResult.intermediateText).toBe("[1 + (**4** + 4 + 4 + 3)]");
    });

    test("one exploding die limited by set depth", () => {
      mockRandom.prime(4, 4, 4, 3);
      const res = roll("1d4!2");
      expect(res.result).toBe(12);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls).toStrictEqual([4, 4, 4]);
      expect(rollResult.intermediateText).toBe("[(**4** + 4 + 4)]");
    });

    test("one exploding die NOT limited by set depth", () => {
      mockRandom.prime(4, 4, 4, 3);
      const res = roll("1d4!4");
      expect(res.result).toBe(15);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as RollEvalResult;
      expect(rollResult.rolls).toStrictEqual([4, 4, 4, 3]);
      expect(rollResult.intermediateText).toBe("[(**4** + 4 + 4 + 3)]");
    });
  });

  describe("keep/drop", () => {
    test("drop lowest one implicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6dL");
      expect(res.result).toBe(14);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(3);
      expect(rollResult.dropped).toStrictEqual([2]);
      expect(rollResult.intermediateText).toBe("[5 + 6 + 3 + ~~2~~]");
    });

    test("drop lowest one explicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6dL1");
      expect(res.result).toBe(14);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(3);
      expect(rollResult.dropped).toStrictEqual([2]);
      expect(rollResult.intermediateText).toBe("[5 + 6 + 3 + ~~2~~]");
    });

    test("drop lowest multiple", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6dL3");
      expect(res.result).toBe(6);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(1);
      expect(rollResult.dropped).toStrictEqual([2, 3, 5]);
      expect(rollResult.intermediateText).toBe("[6 + ~~2~~ + ~~3~~ + ~~5~~]");
    });

    test("drop highest one implicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6dH");
      expect(res.result).toBe(10);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(3);
      expect(rollResult.dropped).toStrictEqual([6]);
      expect(rollResult.intermediateText).toBe("[5 + 2 + 3 + ~~6~~]");
    });

    test("drop highest one explicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6dH1");
      expect(res.result).toBe(10);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(3);
      expect(rollResult.dropped).toStrictEqual([6]);
      expect(rollResult.intermediateText).toBe("[5 + 2 + 3 + ~~6~~]");
    });

    test("drop highest multiple", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6dH3");
      expect(res.result).toBe(2);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(1);
      expect(rollResult.dropped).toStrictEqual([3, 5, 6]);
      expect(rollResult.intermediateText).toBe("[2 + ~~3~~ + ~~5~~ + ~~6~~]");
    });

    test("keep lowest one implicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6kL");
      expect(res.result).toBe(2);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(1);
      expect(rollResult.dropped).toStrictEqual([5, 6, 3]);
      expect(rollResult.intermediateText).toBe("[2 + ~~5~~ + ~~6~~ + ~~3~~]");
    });

    test("keep lowest one explicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6kL1");
      expect(res.result).toBe(2);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(1);
      expect(rollResult.dropped).toStrictEqual([5, 6, 3]);
      expect(rollResult.intermediateText).toBe("[2 + ~~5~~ + ~~6~~ + ~~3~~]");
    });

    test("keep lowest multiple", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6kL3");
      expect(res.result).toBe(10);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(3);
      expect(rollResult.dropped).toStrictEqual([6]);
      expect(rollResult.intermediateText).toBe("[2 + 3 + 5 + ~~6~~]");
    });

    test("keep highest one implicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6kH");
      expect(res.result).toBe(6);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(1);
      expect(rollResult.dropped).toStrictEqual([5, 2, 3]);
      expect(rollResult.intermediateText).toBe("[6 + ~~5~~ + ~~2~~ + ~~3~~]");
    });

    test("keep highest one explicitly", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6kH1");
      expect(res.result).toBe(6);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(1);
      expect(rollResult.dropped).toStrictEqual([5, 2, 3]);
      expect(rollResult.intermediateText).toBe("[6 + ~~5~~ + ~~2~~ + ~~3~~]");
    });

    test("keep highest multiple", () => {
      mockRandom.prime(5, 6, 2, 3);
      const res = roll("4d6kH3");
      expect(res.result).toBe(14);
      expect(res.calculation.kind).toBe("roll");
      const rollResult = res.calculation as KeepDropRollEvalResult;
      expect(rollResult.rolls.length).toBe(3);
      expect(rollResult.dropped).toStrictEqual([2]);
      expect(rollResult.intermediateText).toBe("[3 + 5 + 6 + ~~2~~]");
    });
  });
});
