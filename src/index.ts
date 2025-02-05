import { parse } from "./parser";
import { Context, EvalResult, evaluate } from "./eval";
import { describe } from "./describe";

export * from "./ast";
export * from "./error";
export * from "./parser";
export * from "./eval";
export * from "./describe";

export type RollResult = {
  result: number;
  calculation: EvalResult;
  normalized: string;
};

export function roll(dice: string, config?: Partial<Context>): RollResult {
  const ctx = Object.assign(
    {
      data: new Map<string, number>(),
    },
    config
  );

  const evalResult = evaluate(parse(dice), ctx);

  return {
    result: evalResult.value,
    calculation: evalResult,
    normalized: describe(evalResult.source),
  };
}

console.log(roll("4d6kH3+5"));
