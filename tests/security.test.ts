import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  calculateJwkThumbprint,
  type JWTPayload,
} from "jose";
import { randomUUID, createHash } from "node:crypto";
import { verifyTideJWT } from "@/lib/auth/tideJWT";
import { loadTideConfig, publicConfig } from "@/lib/auth/tidecloakConfig";
import { withAuth } from "@/lib/auth/protect";
import { GET as getResources } from "@/app/api/resources/route";
import { GET as getSession } from "@/app/api/session/route";
import { GET as getActivity } from "@/app/api/activity/route";
import { GET as health } from "@/app/api/resources/[id]/health/route";
import { POST as restart } from "@/app/api/resources/[id]/restart/route";
import { MemoryJtiStore, verifyDpop, requestHtu } from "@/lib/auth/verifyDpop";
// These are ephemeral TEST keys, never Tide-issued tokens or proof of live QEA.
let key: Awaited<ReturnType<typeof generateKeyPair>>,
  proofKey: Awaited<ReturnType<typeof generateKeyPair>>;
let publicProof: Awaited<ReturnType<typeof exportJWK>>, jkt: string;
const original = process.env.CLIENT_ADAPTER;
const now = () => Math.floor(Date.now() / 1000);
const issuer = "https://identity.example.test/realms/cloudguard";
let adapter: Record<string, unknown>;
beforeAll(async () => {
  key = await generateKeyPair("ES256");
  proofKey = await generateKeyPair("ES256", { extractable: true });
  publicProof = await exportJWK(proofKey.publicKey);
  jkt = await calculateJwkThumbprint(publicProof);
  adapter = {
    realm: "cloudguard",
    "auth-server-url": "https://identity.example.test",
    resource: "cloudguard-client",
    "public-client": true,
    jwk: {
      keys: [
        { ...(await exportJWK(key.publicKey)), kid: "test", alg: "ES256" },
      ],
    },
    vendorId: "test-vendor",
    homeOrkUrl: "https://ork.example.test",
  };
  process.env.CLIENT_ADAPTER = JSON.stringify(adapter);
});
afterAll(() => {
  if (original === undefined) delete process.env.CLIENT_ADAPTER;
  else process.env.CLIENT_ADAPTER = original;
});
async function token(
  roles = ["viewer"],
  override: JWTPayload = {},
  signKey = key.privateKey,
) {
  return new SignJWT({
    azp: "cloudguard-client",
    typ: "Bearer",
    realm_access: { roles },
    cnf: { jkt },
    ...override,
  })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .setIssuer(typeof override.iss === "string" ? override.iss : issuer)
    .setSubject("employee-test")
    .setAudience(override.aud || "cloudguard-client")
    .setIssuedAt(typeof override.iat === "number" ? override.iat : now())
    .setExpirationTime(
      typeof override.exp === "number" ? override.exp : now() + 600,
    )
    .sign(signKey);
}
async function proof(
  t: string,
  url: string,
  method: string,
  override: JWTPayload = {},
  pk = proofKey,
  header: Record<string, unknown> = {},
) {
  return new SignJWT({
    jti: randomUUID(),
    htm: method,
    htu: new URL(url).origin + new URL(url).pathname,
    iat: now(),
    ath: createHash("sha256").update(t).digest("base64url"),
    ...override,
  })
    .setProtectedHeader({
      alg: "ES256",
      typ: "dpop+jwt",
      jwk: await exportJWK(pk.publicKey),
      ...header,
    })
    .sign(pk.privateKey);
}
async function request(
  t: string,
  path = "/api/resources/web-prod-01/restart",
  method = "POST",
  headers: Record<string, string> = {},
) {
  const url = `http://localhost:3000${path}`;
  return new Request(url, {
    method,
    headers: {
      authorization: `DPoP ${t}`,
      dpop: await proof(t, url, method),
      "Idempotency-Key": randomUUID(),
      ...headers,
    },
  });
}
describe("Official Tide JWT verifier and pinned configuration", () => {
  it("accepts DPoP access-token type while still requiring sender proof", async () =>
    expect(
      (await verifyTideJWT(await token(["viewer"], { typ: "DPoP" }))).typ,
    ).toBe("DPoP"));
  it("accepts a correctly signed test JWT", async () =>
    expect((await verifyTideJWT(await token())).sub).toBe("employee-test"));
  it.each([
    ["expired", { exp: now() - 60 }],
    ["wrong issuer", { iss: "https://attacker.test/realms/cloudguard" }],
    ["wrong authorized client", { azp: "another-client" }],
    ["wrong audience", { aud: "another-api" }],
    ["future issuance", { iat: now() + 300 }],
    ["ID token", { typ: "ID" }],
  ])("rejects %s", async (_name, claims) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      verifyTideJWT(await token(["viewer"], claims as JWTPayload)),
    ).rejects.toThrow();
    spy.mockRestore();
  });
  it("rejects invalid signature", async () => {
    const attacker = await generateKeyPair("ES256");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      verifyTideJWT(await token(["infra-operator"], {}, attacker.privateKey)),
    ).rejects.toThrow();
    spy.mockRestore();
  });
  it("rejects fabricated and malformed tokens", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(verifyTideJWT("fabricated.token.value")).rejects.toThrow();
    spy.mockRestore();
  });
  it("rejects edited role claims without a new signature", async () => {
    const parts = (await token()).split(".");
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    claims.realm_access.roles = ["infra-operator"];
    parts[1] = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(verifyTideJWT(parts.join("."))).rejects.toThrow();
    spy.mockRestore();
  });
  it("fails closed when pinned key is missing; no remote fallback", () => {
    process.env.CLIENT_ADAPTER = JSON.stringify({ ...adapter, jwk: undefined });
    expect(() => loadTideConfig()).toThrow();
    process.env.CLIENT_ADAPTER = JSON.stringify(adapter);
  });
  it("rejects master realm and private key configuration", () => {
    for (const bad of [
      { ...adapter, realm: "master" },
      { ...adapter, jwk: { keys: [{ kty: "EC", d: "private" }] } },
    ]) {
      process.env.CLIENT_ADAPTER = JSON.stringify(bad);
      expect(() => loadTideConfig()).toThrow();
    }
    process.env.CLIENT_ADAPTER = JSON.stringify(adapter);
  });
  it("public config strips credentials and unrelated fields", () => {
    expect(
      publicConfig({
        ...loadTideConfig(),
        credentials: { secret: "must-not-escape" },
      } as ReturnType<typeof loadTideConfig>),
    ).not.toHaveProperty("credentials");
  });
});
describe("Real DPoP signature and sender constraint validation", () => {
  it("accepts a valid signed proof", async () => {
    const t = await token(),
      r = await request(t);
    await expect(
      verifyDpop(r, t, { cnf: { jkt } }, { jtiStore: new MemoryJtiStore() }),
    ).resolves.toBeUndefined();
  });
  it("rejects a bound token as ordinary Bearer", async () => {
    const t = await token(),
      r = await request(t, undefined, undefined, {
        authorization: `Bearer ${t}`,
      });
    await expect(verifyDpop(r, t, { cnf: { jkt } })).rejects.toThrow();
  });
  it("rejects missing proof and unbound token", async () => {
    const t = await token(),
      r = await request(t);
    await expect(verifyDpop(r, t, {})).rejects.toThrow();
    r.headers.delete("dpop");
    await expect(verifyDpop(r, t, { cnf: { jkt } })).rejects.toThrow();
  });
  it.each([
    ["method", { htm: "DELETE" }],
    ["URL", { htu: "https://attacker.test/" }],
    ["token hash", { ath: "wrong" }],
    ["old timestamp", { iat: now() - 700 }],
    ["future timestamp", { iat: now() + 700 }],
    ["empty jti", { jti: "" }],
  ])("rejects wrong %s", async (_name, override) => {
    const t = await token(),
      r = await request(t);
    r.headers.set("dpop", await proof(t, r.url, r.method, override));
    await expect(verifyDpop(r, t, { cnf: { jkt } })).rejects.toThrow();
  });
  it("rejects a different proof signing key", async () => {
    const t = await token(),
      r = await request(t);
    const other = await generateKeyPair("ES256");
    r.headers.set("dpop", await proof(t, r.url, r.method, {}, other));
    await expect(verifyDpop(r, t, { cnf: { jkt } })).rejects.toThrow();
  });
  it("rejects private proof keys and wrong typ", async () => {
    const t = await token(),
      r = await request(t);
    for (const h of [
      { typ: "JWT" },
      { jwk: await exportJWK(proofKey.privateKey) },
    ]) {
      r.headers.set("dpop", await proof(t, r.url, r.method, {}, proofKey, h));
      await expect(verifyDpop(r, t, { cnf: { jkt } })).rejects.toThrow();
    }
  });
  it("rejects replaying the same signed proof", async () => {
    const t = await token(),
      r = await request(t),
      store = new MemoryJtiStore();
    await verifyDpop(r, t, { cnf: { jkt } }, { jtiStore: store });
    await expect(
      verifyDpop(r, t, { cnf: { jkt } }, { jtiStore: store }),
    ).rejects.toThrow(/replay/);
  });
  it("does not trust forwarded headers and ignores query strings", () => {
    const r = new Request("http://localhost:3000/api/resources?q=1", {
      headers: {
        "x-forwarded-host": "attacker.test",
        "x-forwarded-proto": "https",
      },
    });
    expect(requestHtu(r, false)).toBe("http://localhost:3000/api/resources");
  });
});
describe("Actual route handlers: authorization and synthetic operations", () => {
  it("missing credentials returns 401", async () =>
    expect(
      (await getResources(new Request("http://localhost:3000/api/resources")))
        .status,
    ).toBe(401));
  it("missing configuration returns 503 with no internals", async () => {
    process.env.CLIENT_ADAPTER = "{}";
    const r = await getResources(
      new Request("http://localhost:3000/api/resources", {
        headers: { authorization: "DPoP token" },
      }),
    );
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("ENOENT");
    process.env.CLIENT_ADAPTER = JSON.stringify(adapter);
  });
  it("viewer receives a real 403 despite spoofed role headers", async () => {
    const r = await restart(
      await request(await token(), undefined, undefined, {
        "x-role": "infra-operator",
      }),
    );
    expect(r.status).toBe(403);
    expect(await r.text()).toContain("infra-operator");
  });
  it("a same-name client role cannot replace the realm privilege", async () =>
    expect(
      (
        await restart(
          await request(
            await token(["viewer"], {
              resource_access: { other: { roles: ["infra-operator"] } },
            }),
          ),
        )
      ).status,
    ).toBe(403));
  it("operator restarts synthetic resource, logs action and resets uptime", async () => {
    const r = await restart(await request(await token(["infra-operator"])));
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.synthetic).toBe(true);
    expect(b.resource.restarts).toBe(1);
    expect(Date.now() - b.resource.startedAt).toBeLessThan(2000);
  });
  it("duplicate operation returns original result without restarting twice", async () => {
    const t = await token(["infra-operator"]),
      id = randomUUID();
    const first = await restart(
      await request(t, "/api/resources/db-prod-01/restart", "POST", {
        "Idempotency-Key": id,
      }),
    );
    const second = await restart(
      await request(t, "/api/resources/db-prod-01/restart", "POST", {
        "Idempotency-Key": id,
      }),
    );
    const a = await first.json(),
      b = await second.json();
    expect(second.status).toBe(200);
    expect(b.replayed).toBe(true);
    expect(b.resource.restarts).toBe(a.resource.restarts);
    const conflict = await restart(
      await request(t, "/api/resources/backup-01/restart", "POST", {
        "Idempotency-Key": id,
      }),
    );
    expect(conflict.status).toBe(409);
  });
  it("rapid different restart requests return 409", async () =>
    expect(
      (await restart(await request(await token(["infra-operator"])))).status,
    ).toBe(409));
  it("invalid identifiers return 404 for an operator", async () =>
    expect(
      (
        await restart(
          await request(
            await token(["infra-operator"]),
            "/api/resources/not-real/restart",
          ),
        )
      ).status,
    ).toBe(404));
  it("missing idempotency key returns 400", async () =>
    expect(
      (
        await restart(
          await request(
            await token(["infra-operator"]),
            "/api/resources/backup-01/restart",
            "POST",
            { "Idempotency-Key": "" },
          ),
        )
      ).status,
    ).toBe(400));
  it("cross-origin writes return 403", async () =>
    expect(
      (
        await restart(
          await request(await token(["infra-operator"]), undefined, undefined, {
            origin: "https://attacker.test",
          }),
        )
      ).status,
    ).toBe(403));
  it("health works for viewer; unknown resource returns 404", async () => {
    const t = await token();
    expect(
      (
        await health(
          await request(t, "/api/resources/web-prod-01/health", "GET"),
        )
      ).status,
    ).toBe(200);
    expect(
      (await health(await request(t, "/api/resources/missing/health", "GET")))
        .status,
    ).toBe(404);
  });
  it("session returns verified role metadata without credentials", async () => {
    const r = await getSession(
        await request(await token(), "/api/session", "GET"),
      ),
      body = await r.json();
    expect(body.operator).toBe(false);
    expect(body.quorum.verified).toBe(false);
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("credentials");
  });
  it("logs include denied and authorized operations without tokens", async () => {
    const t = await token(),
      r = await getActivity(await request(t, "/api/activity", "GET")),
      body = await r.json();
    expect(
      body.events.some((e: { outcome: string }) => e.outcome === "denied"),
    ).toBe(true);
    expect(
      body.events.some((e: { outcome: string }) => e.outcome === "allowed"),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain(t);
    expect(JSON.stringify(body)).not.toContain("eyJ");
  });
  it("handler bugs produce 500 rather than an authentication error", async () => {
    const handler = withAuth(async () => {
      throw new Error("sensitive-internal-detail");
    });
    const r = await handler(
      await request(await token(), "/api/failure", "GET"),
    );
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("sensitive-internal-detail");
  });
});
