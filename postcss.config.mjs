import path from "node:path";
const config = { plugins: { [path.resolve("scripts/theme-tokens.cjs")]: {} } };
export default config;
