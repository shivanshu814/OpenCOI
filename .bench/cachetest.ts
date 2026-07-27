import { cache } from "react";
let calls = 0;
const f = cache(async (x: number) => { calls++; return x * 2; });
async function main() {
  const a = await f(1); const b = await f(1); const c = await f(2);
  console.log({ a, b, c, calls });
}
main().catch((e) => console.log("THREW:", (e as Error).message));
