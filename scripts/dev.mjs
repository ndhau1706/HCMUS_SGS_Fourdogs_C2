import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const production = process.argv.includes("--production");
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    production ? "start" : "dev",
    ...(production ? [] : ["--webpack"]),
    "-H",
    "127.0.0.1",
    "-p",
    "3000",
  ],
  { cwd: root, stdio: "inherit" },
);
mkdirSync(new URL("../.data", import.meta.url), { recursive: true });
const file = new URL("../.data/cloudguard.pid", import.meta.url);
writeFileSync(file, String(child.pid));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  try {
    unlinkSync(file);
  } catch {}
  process.exit(code ?? 0);
});
