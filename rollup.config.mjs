import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";

export default [
  {
    plugins: [typescript()],
    input: "src/index.ts",
    output: {
      file: "dist/miniroll.js",
      format: "cjs",
    }
  },
  {
    plugins: [dts()],
    input: "src/index.ts",
    output: {
      file: "dist/miniroll.d.ts",
      format: "es",
    }
  },
]
