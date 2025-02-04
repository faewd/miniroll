import { parse } from "./parser";
import { Context, EvalResult, evaluate } from "./eval";

export * from "./ast";
export * from "./error";
export * from "./parser";
export * from "./eval";

export function roll(dice: string, config?: Partial<Context>): EvalResult {
  const ctx = Object.assign(
    {
      data: new Map<string, number>(),
    },
    config
  );

  return evaluate(parse(dice), ctx);
}
