import {
  BinaryExpression,
  ComparisonOperator,
  Expression,
  Operator,
  Roll,
  RollModifier,
  TermExpression,
} from "./ast";
import { Context } from "./index";

export type EvalResult =
  | RollEvalResult
  | NumEvalResult
  | IdentEvalResult
  | BinOpEvalResult;

type BaseEvalResult = { value: number; source: Expression };

type BaseRollEvalResult = {
  value: number;
  rolls: number[];
  intermediateText: string;
};

export type RollEvalResult = {
  kind: "roll";
  source: Expression;
} & (UnmodifiedRollEvalResult | ModifiedRollEvalResult);

type UnmodifiedRollEvalResult = BaseRollEvalResult & { modifier: "none" };

type ModifiedRollEvalResult =
  | RerollRollEvalResult
  | KeepDropRollEvalResult
  | ExplodeRollEvalResult;

type RerollRollEvalResult = BaseRollEvalResult & {
  modifier: "reroll";
  rerollGroups: RerollGroup[];
};

type KeepDropRollEvalResult = BaseRollEvalResult & {
  modifier: "keep-drop";
  dropped: number[];
};

type ExplodeRollEvalResult = BaseRollEvalResult & {
  modifier: "explode";
  explodeGroups: ExplodeGroup[];
};

type RerollGroup = { discarded: number[]; final: number };

type ExplodeGroup = {
  initial: number;
  additional: number[];
  total: number;
};

export type NumEvalResult = BaseEvalResult & {
  kind: "num";
};

export type IdentEvalResult = BaseEvalResult & {
  kind: "ident";
};

export type BinOpEvalResult = BaseEvalResult & {
  kind: "binary";
  value: number;
  intermediate: { lhs: EvalResult; op: Operator; rhs: EvalResult };
};

export function evaluate(expr: Expression, ctx: Context): EvalResult {
  switch (expr.kind) {
    case "term":
      return evaluateTerm(expr, ctx);
    case "binary":
      return evaluateBinOp(expr, ctx);
  }
}

function evaluateBinOp(expr: BinaryExpression, ctx: Context): EvalResult {
  const { op } = expr;
  const lhs = evaluate(expr.lhs, ctx);
  const rhs = evaluate(expr.rhs, ctx);
  const value = computeBinOp(lhs.value, op, rhs.value);
  return {
    kind: "binary",
    value,
    intermediate: { lhs, op, rhs },
    source: expr,
  };
}

function computeBinOp(a: number, op: Operator, b: number): number {
  switch (op) {
    case "-":
      return a - b;
    case "+":
      return a + b;
    case "/":
      return a / b;
    case "*":
      return a * b;
  }
}

function evaluateTerm(expr: TermExpression, ctx: Context): EvalResult {
  const { term } = expr;
  if (typeof term === "number")
    return { kind: "num", value: term, source: expr };
  if (typeof term === "string") {
    const value = ctx.data.get(term);
    if (value === undefined)
      throw new EvalError(
        `Failed to evaluate term '${term}' - identifier is undefined`
      );
    return { kind: "ident", value, source: expr };
  }
  return evaluateRoll(expr, term, ctx);
}

function evaluateRoll(
  expr: TermExpression,
  roll: Roll,
  ctx: Context
): RollEvalResult {
  const result =
    roll.modifier !== null
      ? evaluateModifiedRoll(roll, roll.modifier, ctx)
      : evaluateUnmodifiedRoll(roll, ctx);

  return {
    kind: "roll",
    source: expr,
    ...result,
  };
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b);
}

function evaluateUnmodifiedRoll(
  roll: Roll,
  ctx: Context
): UnmodifiedRollEvalResult {
  const rolls: number[] = [];
  for (let i = 0; i < roll.count; i++) {
    rolls.push(ctx.randomProvider(roll.sides));
  }
  return {
    modifier: "none",
    rolls,
    value: sum(rolls),
    intermediateText: `[${rolls.join(" + ")}]`,
  };
}

function evaluateModifiedRoll(
  roll: Roll,
  mod: RollModifier,
  ctx: Context
): ModifiedRollEvalResult {
  switch (mod.kind) {
    case "explode":
      return evaluateExplodingRoll(roll, mod.depth, ctx);
    case "keep":
    case "drop":
      return evaluateKeepDropRoll(roll, mod.kind, mod.count, mod.end, ctx);
    case "reroll":
      return evaluateRerollRoll(roll, mod.comparator, mod.target, ctx);
  }
}

function evaluateExplodingRoll(
  roll: Roll,
  maxDepth: number,
  ctx: Context
): ExplodeRollEvalResult {
  const rolls: number[] = [];
  const groups: ExplodeGroup[] = [];
  for (let i = 0; i < roll.count; i++) {
    const group: ExplodeGroup = { initial: -1, additional: [], total: 0 };
    let current: number;
    let explodeDepth = 0;
    do {
      current = ctx.randomProvider(roll.sides);
      rolls.push(current);
      if (group.initial === -1) {
        group.initial = current;
      } else {
        group.additional.push(current);
      }
      group.total += current;
      explodeDepth += 1;
    } while (current === roll.sides && explodeDepth <= maxDepth);
    groups.push(group);
  }

  const groupTexts = groups.map((g) =>
    g.additional.length === 0
      ? g.initial
      : `(**${g.initial}** + ${g.additional.join(" + ")})`
  );

  return {
    modifier: "explode",
    rolls,
    value: sum(rolls),
    explodeGroups: groups,
    intermediateText: `[${groupTexts.join(" + ")}]`,
  };
}

function evaluateKeepDropRoll(
  roll: Roll,
  kind: "keep" | "drop",
  count: number,
  end: "highest" | "lowest",
  ctx: Context
): KeepDropRollEvalResult {
  const rawRolls: number[] = [];
  for (let i = 0; i < roll.count; i++) {
    rawRolls.push(ctx.randomProvider(roll.sides));
  }

  const { dropped, kept } = dropOrKeepRolls(rawRolls, kind, count, end);
  const diceTexts = [...kept, ...dropped.map((d) => `~~${d}~~`)];

  return {
    modifier: "keep-drop",
    rolls: kept,
    dropped,
    value: kept.reduce((a, b) => a + b),
    intermediateText: `[${diceTexts.join(" + ")}]`,
  };
}

function evaluateRerollRoll(
  roll: Roll,
  comparator: ComparisonOperator,
  target: number,
  ctx: Context
): RerollRollEvalResult {
  const rolls: number[] = [];
  const groups: RerollGroup[] = [];
  for (let i = 0; i < roll.count; i++) {
    const group: RerollGroup = {
      discarded: [],
      final: -1,
    };

    while (group.final === -1) {
      const result = ctx.randomProvider(roll.sides);
      if (shouldReroll(group.final, comparator, target)) {
        group.discarded.push(result);
      } else {
        group.final = result;
      }
    }

    rolls.push(group.final);
    groups.push(group);
  }

  const groupTexts = groups.map((g) =>
    g.discarded.length === 0
      ? g.final
      : `(${g.discarded.map((d) => `~~${d}~~`).join(" ")} ${g.final})`
  );

  return {
    modifier: "reroll",
    rolls,
    value: sum(rolls),
    rerollGroups: groups,
    intermediateText: `[${groupTexts}]`,
  };
}

function shouldReroll(
  result: number,
  comparator: ComparisonOperator,
  target: number
) {
  switch (comparator) {
    case "=":
      return result == target;
    case "<>":
      return result != target;
    case "<":
      return result < target;
    case ">":
      return result > target;
    case "<=":
      return result <= target;
    case ">=":
      return result >= target;
  }
}

function dropOrKeepRolls(
  rolls: number[],
  kind: "keep" | "drop",
  count: number,
  end: "highest" | "lowest"
): { dropped: number[]; kept: number[] } {
  const sorted = rolls.toSorted((a, b) => a - b);

  const selection =
    end === "lowest" ? sorted.splice(0, count) : sorted.splice(-count, count);

  const selected: number[] = [];
  const unselected = [...rolls];
  for (const roll of selection) {
    const idx = unselected.indexOf(roll);
    selected.push(unselected.splice(idx, 1)[0]);
  }

  if (kind === "keep") {
    return {
      kept: selected,
      dropped: unselected,
    };
  } else {
    return {
      kept: unselected,
      dropped: selected,
    };
  }
}
