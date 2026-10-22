import { spawn } from "node:child_process";
const production = process.argv.includes("--production");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", production ? "start" : "dev", ...(!production ? ["--webpack"] : []), "-H", "127.0.0.1", "-p", process.env.DEMO_PORT || "3001"], { stdio: "inherit", env: { ...process.env, CLOUDGUARD_DEMO_MODE: "true" } });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => process.exit(code ?? 0));
