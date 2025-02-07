import { parse } from "./parser";
import { EvalResult, evaluate } from "./eval";
import { describe } from "./describe";

export * from "./ast";
export * from "./error";
export * from "./parser";
export * from "./eval";
export * from "./describe";

export type Roller = (dice: string) => RollResult;

export type RollResult = {
  result: number;
  calculation: EvalResult;
  normalized: string;
};

export type RandomProvider = (sides: number) => number;

export type Context = {
  data: Map<string, number>;
  randomProvider: RandomProvider;
};

const DEFAULT_CONTEXT: Context = {
  data: new Map<string, number>(),
  randomProvider: (sides) => Math.floor(Math.random() * sides) + 1,
};

export function roll(dice: string, config?: Partial<Context>): RollResult {
  const ctx = Object.assign(DEFAULT_CONTEXT, config);

  const evalResult = evaluate(parse(dice), ctx);

  return {
    result: evalResult.value,
    calculation: evalResult,
    normalized: describe(evalResult.source),
  };
}

export function createRoller(config: Partial<Context>): Roller {
  return (dice) => roll(dice, config);
}
