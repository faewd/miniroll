export type Roll = {
  count: number;
  sides: number;
  modifier: RollModifier | null;
};

export type ComparisonOperator = "=" | "<>" | "<" | ">" | "<=" | ">=";

export type RollModifier =
  | { kind: "explode" }
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

export type Expression =
  | { kind: "term"; term: Term }
  | { kind: "binary"; lhs: Expression; op: Operator; rhs: Expression };
