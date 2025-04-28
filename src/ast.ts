export type Roll = {
  count: number;
  sides: number;
  modifier: RollModifier | null;
};

export type ComparisonOperator = "=" | "<>" | "<" | ">" | "<=" | ">=";

export type RollModifier =
  | { kind: "explode"; depth: number }
  | { kind: "keep"; count: number; end: "highest" | "lowest" }
  | { kind: "drop"; count: number; end: "highest" | "lowest" }
  | {
      kind: "reroll";
      target: number;
      comparator: ComparisonOperator;
    };

export const operators = ["-", "+", "/", "*"] as const;

export type Operator = (typeof operators)[number];

export type Term = Roll | number | string;

export type Expression = TermExpression | BinaryExpression;

export type TermExpression = { kind: "term"; term: Term };
export type BinaryExpression = {
  kind: "binary";
  lhs: Expression;
  op: Operator;
  rhs: Expression;
};
