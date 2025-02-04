import { Expression, Operator, Roll, RollModifier, Term } from "./ast";

export type EvalResult =
  | {
      kind: "roll";
      value: number;
      rolls: number[];
      rawRolls: number[];
      dropped: number[];
      source: Roll;
    }
  | { kind: "num"; value: number }
  | { kind: "ident"; value: number; source: string }
  | {
      kind: "binary";
      value: number;
      source: { lhs: EvalResult; op: Operator; rhs: EvalResult };
    };

export type Context = {
  data: Map<string, number>;
};

export function evaluate(expr: Expression, ctx: Context): EvalResult {
  switch (expr.kind) {
    case "term":
      return evaluateTerm(expr.term, ctx);
    case "binary":
      const { lhs, op, rhs } = expr;
      return evaluateBinOp(lhs, op, rhs, ctx);
  }
}

function evaluateBinOp(
  lhs: Expression,
  op: Operator,
  rhs: Expression,
  ctx: Context
): EvalResult {
  const lVal = evaluate(lhs, ctx);
  const rVal = evaluate(rhs, ctx);
  const value = computeBinOp(lVal.value, op, rVal.value);
  return {
    kind: "binary",
    value,
    source: { lhs: lVal, op, rhs: rVal },
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

function evaluateTerm(term: Term, ctx: Context): EvalResult {
  if (typeof term === "number") return { kind: "num", value: term };
  if (typeof term === "string") {
    const value = ctx.data.get(term);
    if (value === undefined)
      throw new EvalError(
        `Failed to evaluate term '${term}' - identifier is undefined`
      );
    return { kind: "ident", value, source: term };
  }
  return evaluateRoll(term);
}

function rand(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function evaluateRoll(roll: Roll): EvalResult {
  const { count, sides, modifier } = roll;
  const rawRolls: number[] = [];
  for (let i = 0; i < count; i++) {
    let result: number;
    do {
      result = rand(sides);
    } while (shouldReroll(result, modifier));

    rawRolls.push(result);

    // Roll again if exploding
    if (modifier?.kind === "explode" && result === sides) i -= 1;
  }

  const { dropped, kept } = dropOrKeepRolls(rawRolls, modifier);

  const total = kept.reduce((a, b) => a + b);

  return {
    kind: "roll",
    value: total,
    rolls: kept,
    rawRolls,
    dropped,
    source: roll,
  };
}

function shouldReroll(result: number, modifier: RollModifier | null) {
  if (modifier?.kind === "reroll") {
    const { target, comparator } = modifier;
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
  return false;
}

function dropOrKeepRolls(
  rolls: number[],
  modifier: RollModifier | null
): { dropped: number[]; kept: number[] } {
  if (
    modifier === null ||
    (modifier.kind !== "drop" && modifier.kind !== "keep")
  )
    return { dropped: [], kept: [...rolls] };

  const sorted = rolls.toSorted((a, b) => a - b);

  const { kind, end, count } = modifier;

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
