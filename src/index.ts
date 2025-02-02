import { parse } from "./parser";
export * from "./ast";
export * from "./error";

console.log(parse("1d20 + 5 + DEX"));
