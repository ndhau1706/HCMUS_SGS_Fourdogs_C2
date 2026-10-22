import { beforeAll, afterAll, it, expect } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  calculateJwkThumbprint,
  type JWTPayload,
} from "jose";
import { createHash, randomUUID } from "node:crypto";
let child: ChildProcess,
  base: string,
  key: Awaited<ReturnType<typeof generateKeyPair>>,
  binding: Awaited<ReturnType<typeof generateKeyPair>>,
  jkt: string;
const issuer = "https://integration.example.test/realms/cloudguard";
// Separate built Next.js server with standard public-key configuration, not an auth bypass.
// Keys are ephemeral test material. No genuine Tide enrollment or QEA is implied.
beforeAll(async () => {
  key = await generateKeyPair("ES256");
  binding = await generateKeyPair("ES256");
  jkt = await calculateJwkThumbprint(await exportJWK(binding.publicKey));
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const addr = probe.address();
  if (!addr || typeof addr === "string") throw new Error();
  const port = addr.port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  base = `http://localhost:${port}`;
  const config = {
    realm: "cloudguard",
    resource: "cloudguard-client",
    "auth-server-url": "https://integration.example.test",
    "public-client": true,
    jwk: {
      keys: [
        {
          ...(await exportJWK(key.publicKey)),
          kid: "integration",
          alg: "ES256",
        },
      ],
    },
    vendorId: "test-only",
    homeOrkUrl: "https://ork.example.test",
  };
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      env: { ...process.env, CLIENT_ADAPTER: JSON.stringify(config) },
      stdio: "inherit",
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/api/config`)).ok) return;
    } catch {}
    if (child.exitCode !== null) throw new Error("Integration server exited");
    await delay(100);
  }
  throw new Error("Integration server did not start");
});
afterAll(async () => {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  }
});
async function credentials(roles = ["viewer"], override: JWTPayload = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    typ: "DPoP",
    azp: "cloudguard-client",
    realm_access: { roles },
    cnf: { jkt },
    ...override,
  })
    .setProtectedHeader({ alg: "ES256", kid: "integration" })
    .setIssuer(issuer)
    .setAudience("cloudguard-client")
    .setSubject("http-test-employee")
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .sign(key.privateKey);
}
async function headers(token: string, path: string, method: string) {
  const proof = await new SignJWT({
    jti: randomUUID(),
    htm: method,
    htu: `${base}${path}`,
    iat: Math.floor(Date.now() / 1000),
    ath: createHash("sha256").update(token).digest("base64url"),
  })
    .setProtectedHeader({
      alg: "ES256",
      typ: "dpop+jwt",
      jwk: await exportJWK(binding.publicKey),
    })
    .sign(binding.privateKey);
  return {
    authorization: `DPoP ${token}`,
    dpop: proof,
    "Idempotency-Key": randomUUID(),
  };
}
it("built HTTP server denies viewer restart with 403", async () => {
  const p = "/api/resources/web-prod-01/restart";
  const r = await fetch(base + p, {
    method: "POST",
    headers: await headers(await credentials(), p, "POST"),
  });
  expect(r.status).toBe(403);
});
it("built HTTP server permits an operator synthetic restart and shares the state/logs across routes", async () => {
  const token = await credentials(["infra-operator"]),
    p = "/api/resources/web-prod-01/restart";
  const r = await fetch(base + p, {
    method: "POST",
    headers: await headers(token, p, "POST"),
  });
  expect(r.status).toBe(200);
  expect((await r.json()).synthetic).toBe(true);
  const resources = await fetch(base + "/api/resources", {
    headers: await headers(token, "/api/resources", "GET"),
  });
  expect(
    (await resources.json()).resources.find(
      (r: { id: string }) => r.id === "web-prod-01",
    ).restarts,
  ).toBe(1);
  const log = await fetch(base + "/api/activity", {
    headers: await headers(token, "/api/activity", "GET"),
  });
  expect(
    (await log.json()).events.some(
      (e: { outcome: string }) => e.outcome === "allowed",
    ),
  ).toBe(true);
});
it("built HTTP server returns the original result for an idempotent retry with a fresh proof", async () => {
  const token = await credentials(["infra-operator"]),
    p = "/api/resources/db-prod-01/restart",
    id = randomUUID();
  const call = async () =>
    fetch(base + p, {
      method: "POST",
      headers: { ...(await headers(token, p, "POST")), "Idempotency-Key": id },
    });
  expect((await call()).status).toBe(200);
  const retry = await call();
  expect(retry.status).toBe(200);
  expect((await retry.json()).replayed).toBe(true);
});
it("built HTTP server rejects replayed proof even with an idempotency key", async () => {
  const token = await credentials(),
    p = "/api/resources",
    h = await headers(token, p, "GET");
  expect((await fetch(base + p, { headers: h })).status).toBe(200);
  expect((await fetch(base + p, { headers: h })).status).toBe(401);
});
it("built HTTP server rejects cross-route replay state and URL tampering", async () => {
  const token = await credentials(),
    p = "/api/resources",
    h = await headers(token, p, "GET");
  expect((await fetch(base + p, { headers: h })).status).toBe(200);
  expect((await fetch(base + "/api/session", { headers: h })).status).toBe(401);
});
it("built HTTP server rejects frontend role spoofing and Bearer replay", async () => {
  const t = await credentials(),
    p = "/api/resources/backup-01/restart";
  const h = await headers(t, p, "POST");
  expect(
    (
      await fetch(base + p, {
        method: "POST",
        headers: {
          ...h,
          "x-role": "infra-operator",
          "content-type": "application/json",
        },
        body: JSON.stringify({ role: "infra-operator" }),
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(base + "/api/resources", {
        headers: { authorization: `Bearer ${t}` },
      })
    ).status,
  ).toBe(401);
});
it("built HTTP server provides no role-grant endpoint", async () =>
  expect(
    (await fetch(base + "/api/admin/grant-role", { method: "POST" })).status,
  ).toBe(404));
