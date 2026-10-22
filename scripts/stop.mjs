import { readFileSync, readlinkSync, realpathSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
try {
  const file = new URL("../.data/cloudguard.pid", import.meta.url),
    pid = Number(readFileSync(file, "utf8"));
  if (!Number.isInteger(pid) || pid <= 1) throw new Error();
  const cmd = readFileSync(`/proc/${pid}/cmdline`, "utf8");
  if (
    realpathSync(readlinkSync(`/proc/${pid}/cwd`)) !== root ||
    !cmd.includes("next")
  )
    throw new Error();
  process.kill(pid, "SIGTERM");
  unlinkSync(file);
  console.log("CloudGuard stopped.");
} catch {
  console.log(
    "No matching CloudGuard process found. Use Ctrl+C in its terminal if needed.",
  );
}
let configuredHost;
try {
  configuredHost = parseEnv(
    readFileSync(new URL("../.env", import.meta.url), "utf8"),
  ).DOCKER_HOST;
} catch {}
const result = spawnSync("docker", ["stop", "cloudguard-tidecloak"], {
  env: {
    ...process.env,
    DOCKER_HOST:
      configuredHost ||
      process.env.DOCKER_HOST ||
      "unix:///var/run/docker.sock",
  },
  stdio: "inherit",
});
if (result.status !== 0)
  console.log(
    "Tide container could not be stopped; check Docker access. No data was removed.",
  );
