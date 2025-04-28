import { Expression, Operator, RollModifier, Term } from "./ast";

export function describe(expr: Expression): string {
  switch (expr.kind) {
    case "term":
      return describeTerm(expr.term);
    case "binary":
      const { lhs, op, rhs } = expr;
      return describeBinOp(lhs, op, rhs);
  }
}

function describeTerm(term: Term): string {
  if (typeof term === "string") return term;
  if (typeof term === "number") return String(term);
  const { count, sides, modifier } = term;
  return `${count}d${sides}${describeModifier(modifier)}`;
}

function describeModifier(modifier: RollModifier | null): string {
  if (modifier === null) return "";
  if (modifier.kind === "explode") {
    return "!" + (modifier.depth === 1000 ? "" : `${modifier.depth}`);
  }
  if (modifier.kind === "reroll")
    return `rr${modifier.comparator}${modifier.target}`;
  const dropOrKeep = modifier.kind === "drop" ? "d" : "k";
  const end = modifier.end === "highest" ? "H" : "L";
  return dropOrKeep + end + String(modifier.count);
}

function describeBinOp(lhs: Expression, op: Operator, rhs: Expression): string {
  return describe(lhs) + " " + op + " " + describe(rhs);
}
