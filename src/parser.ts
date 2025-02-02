import {
  Expression,
  Operator,
  operators,
  Roll,
  RollModifier,
  Term,
} from "./ast";
import { ParserError } from "./error";

const DICE_PATTERN =
  /^(?<count>\d+)?d(?<sides>\d+)(?<modifier>(([dk][hl]\d*)|rr(?<comparator><>|<=?|>=?|=)?(?<target>\d+)|!)?)/i;
const IDENT_PATTERN = /^[a-zA-Z_\.][a-zA-Z_\.0-9]*/;
const NUM_PATTERN = /^(0|([1-9][0-9]*))/;

type ParseResult<T> =
  | { ok: true; match: T; rest: string }
  | { ok: false; expected: string[]; rest: string };

function success<T>(match: T, rest: string): ParseResult<T> {
  return { ok: true, match, rest };
}

function fail<T>(input: string, ...expected: string[]): ParseResult<T> {
  return { ok: false, expected, rest: input };
}

type Parser<T> = (input: string) => ParseResult<T>;

type OneOf<T extends Array<Parser<unknown>>> = T extends Array<infer P>
  ? P extends Parser<infer R>
    ? R
    : never
  : never;

function oneOf<T extends Array<Parser<unknown>>>(
  ...parsers: T
): Parser<OneOf<T>> {
  return (input: string) => {
    const expected: string[] = [];
    for (const parser of parsers) {
      const res = parser(input);
      if (res.ok) return res as ParseResult<OneOf<T>>;
      expected.push(...res.expected);
    }
    return fail(input, ...expected);
  };
}

type Seq<T extends Array<Parser<unknown>>> = {
  [K in keyof T]: T[K] extends Parser<infer E> ? E : never;
};

function seq<T extends Array<Parser<unknown>>>(...parsers: T): Parser<Seq<T>> {
  return (input: string) => {
    const matches: unknown[] = [];
    let rest = input.trimStart();
    for (const parser of parsers) {
      const res = parser(rest);
      if (!res.ok) return fail(input, ...res.expected);
      matches.push(res.match);
      rest = res.rest.trimStart();
    }
    return success(matches as Seq<T>, rest);
  };
}

function zeroOrMore<T>(parser: Parser<T>): Parser<T[]> {
  return (input: string) => {
    const matches: T[] = [];
    let rest = input;
    let res: ParseResult<T>;
    do {
      res = parser(rest);
      rest = res.rest;
      if (!res.ok) break;
      matches.push(res.match);
    } while (res.ok);
    return success(matches, rest);
  };
}

function regex(re: RegExp): Parser<string> {
  if (!re.source.startsWith("^"))
    throw new ParserError(
      "The regex parser's expression must start with the caret anchor."
    );

  return (input: string) => {
    const match = input.match(re);
    if (match === null) return fail(input, re.source);
    return success(match[0], input.slice(match[0].length));
  };
}

function identifier() {
  return regex(IDENT_PATTERN);
}

const _parseNumStr = regex(NUM_PATTERN);
function num(): Parser<number> {
  return (input: string) => {
    const res = _parseNumStr(input);
    if (!res.ok) return fail(input, "number");
    const num = parseInt(res.match);
    return success(num, res.rest);
  };
}

function roll(): Parser<Roll> {
  return (input: string) => {
    const match = input.match(DICE_PATTERN);
    if (match === null) return fail(input, "dice roll");
    const roll = {
      count: parseInt(match.groups!.count ?? 1, 10),
      sides: parseInt(match.groups!.sides, 10),
      modifier: match.groups!.modifier
        ? resolveRollModifier(match.groups!, match[0])
        : null,
    };
    return success(roll, input.slice(match[0].length));
  };
}

function resolveRollModifier(
  { modifier, ...groups }: Record<string, string>,
  roll: string
): RollModifier {
  const mod = modifier.toLowerCase();
  if (mod === "!") return { kind: "explode" };
  if (mod.startsWith("k") || mod.startsWith("d")) {
    const kind = mod.startsWith("k") ? "keep" : "drop";
    const end = mod.charAt(1) === "l" ? "lowest" : "highest";
    const count = parseInt(mod.slice(2) || "1");
    return { kind, end, count };
  }
  if (mod.startsWith("rr")) {
    const comparator = (groups.comparator ? groups.comparator : "=") as any;
    const target = parseInt(groups.target, 10);
    return { kind: "reroll", comparator, target };
  }

  throw new ParserError(`Invalid modifier on roll "${roll}"`);
}

function term(): Parser<Term> {
  return oneOf(roll(), identifier(), num());
}

function operator(): Parser<Operator> {
  const escapedOperators = operators.join("").replace("-", "\\-");
  return regex(new RegExp(`^[${escapedOperators}]`)) as Parser<Operator>;
}

const _parseExpr = seq(term(), zeroOrMore(seq(operator(), term())));
function expression(): Parser<Expression> {
  return (input: string) => {
    const res = _parseExpr(input);
    if (!res.ok) return res;
    const [head, tail] = res.match;
    const tailExprs = tail.map(
      ([op, term]) => [op, { kind: "term", term }] as const
    );
    const expr = nestBinaryExpression(
      { kind: "term", term: head },
      tailExprs,
      0
    );
    return success(expr, res.rest);
  };
}

function nestBinaryExpression(
  head: Expression,
  tail: (readonly [Operator, Expression])[],
  precedence: number
): Expression {
  if (tail.length === 0) return head;
  if (tail.length === 1) {
    const [op, rhs] = tail[0];
    return {
      kind: "binary",
      lhs: head,
      op,
      rhs,
    };
  }
  const currentOp = operators[precedence];
  const opIdx = tail.findIndex(([op, _]) => op === currentOp);
  if (opIdx === -1) return nestBinaryExpression(head, tail, precedence + 1);

  const [op, rHead] = tail[opIdx];
  const lhs = nestBinaryExpression(head, tail.slice(0, opIdx), precedence + 1);
  const rhs = nestBinaryExpression(rHead, tail.slice(opIdx + 1), precedence);
  return { kind: "binary", lhs, op, rhs };
}

export function parse(input: string): Expression {
  const parser = expression();
  const res = parser(input);
  if (!res.ok) {
    const expectedList = res.expected.join(", ");
    const lastCommaIdx = expectedList.lastIndexOf(",");
    const expectedWithOr =
      lastCommaIdx === -1
        ? expectedList
        : expectedList.substring(0, lastCommaIdx) +
          " or " +
          expectedList.substring(lastCommaIdx + 1);

    throw new ParserError(`Expected ${expectedWithOr}, found ${res.rest}`);
  }
  if (res.rest.length > 0)
    throw new ParserError(`Expected end of input, found ${res.rest}`);
  return res.match;
}
