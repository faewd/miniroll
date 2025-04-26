# Miniroll

**A TypeScript-first dice rolling library.**

## Installation

```sh
npm i miniroll
```

## Usage

### Basic Usage

Miniroll supports basic dice notation (`<count>d<sides>`) and basic arithmetic (`+`, `-`, `*`, `/`).

```ts
import { roll } from "miniroll";

console.log(roll("2d6 + 4"));
```

#### Output

The return value of `roll` is a an object containing the `result` of the roll, the `normalized` dice notation, and a `calculation` object containing the full details of the calculation, including intermediate steps in the calculation, information about discarded dice, etc.

```json
{
  "result": 9,
  "normalized": "2d6 + 4",
  "calculation": {
    "kind": "binary",
    "value": 9,
    "intermediate": {
      "lhs": {
        "kind": "roll",
        "value": 5,
        "rolls": [2, 3],
        "rawRolls": [2, 3],
        "dropped": [],
        "source": {
          "kind": "term",
          "term": {
            "count": 2,
            "sides": 6,
            "modifier": null
          }
        }
      },
      "op": "+",
      "rhs": {
        "kind": "num",
        "value": 4,
        "source": {
          "kind": "term",
          "term": 4
        }
      }
    },
    "source": {
      "kind": "binary",
      "lhs": {
        "kind": "term",
        "term": {
          "count": 2,
          "sides": 6,
          "modifier": null
        }
      },
      "op": "+",
      "rhs": {
        "kind": "term",
        "term": 4
      }
    }
  }
}
```
