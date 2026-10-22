import { it, expect, afterEach } from "vitest";
import { DemoEngine, DemoError } from "../src/lib/demo/engine";
import { GET, POST } from "../src/app/api/demo/[...path]/route";
import { withAuth, json } from "../src/lib/auth/protect";
const original = process.env.CLOUDGUARD_DEMO_MODE;
afterEach(() => { if (original === undefined) delete process.env.CLOUDGUARD_DEMO_MODE; else process.env.CLOUDGUARD_DEMO_MODE = original; });
it("starts viewer-only, denies operations before quorum, and logs actual transitions", () => {
  const d = new DemoEngine(); const e = d.identify(d.login("employee"));
  expect(d.view(e).identity.roles).toEqual(["viewer"]);
  expect(() => d.restart(e)).toThrow(DemoError); expect(d.view(e).resource.restarts).toBe(0);
  d.request(e); const a = d.identify(d.login("admin-a")); d.approve(a);
  expect(d.view(e).request?.status).toBe("PENDING"); expect(() => d.restart(e)).toThrow("infra-operator");
  const anotherA = d.identify(d.login("admin-a")); expect(() => d.approve(anotherA)).toThrow("Duplicate");
  expect(d.view(e).request?.approvals).toEqual(["Admin A"]);
  const b = d.identify(d.login("admin-b")); d.approve(b);
  expect(d.view(e).request?.status).toBe("AUTHORIZED"); expect(d.view(e).identity.roles).toContain("infra-operator");
  d.restart(e); expect(d.view(e).resource.restarts).toBe(1);
  const events = d.view(e).events;
  expect(events.find(x => x.action === "approval.duplicate")?.status).toBe(409);
  expect(events.filter(x => x.action === "grant.applied")).toHaveLength(1);
  expect(events[0].action).toBe("restart.allowed");
});
it("denies employee approval, admin self-escalation, invalid identities and anonymous sessions", () => {
  const d = new DemoEngine(); d.request("employee");
  expect(() => d.approve("employee")).toThrow("administrator");
  expect(() => d.request("admin-a")).toThrow("Employee");
  expect(() => d.restart("admin-a")).toThrow("infra-operator");
  for (const value of ["root", "__proto__", "constructor", { role: "infra-operator" }, null]) expect(() => d.login(value)).toThrow();
  expect(() => d.identify(undefined)).toThrow("identity");
});
it("reset restores viewer and removes stale grants", () => {
  const d = new DemoEngine(); d.request("employee"); d.approve("admin-a"); d.approve("admin-c");
  expect(() => d.reset("employee")).toThrow(); d.reset("admin-c");
  expect(d.view("employee").identity.roles).toEqual(["viewer"]);
  expect(d.view("employee").request).toBeNull(); expect(() => d.approve("admin-a")).toThrow("No access request");
});
const request = (path: string, cookie = "", body: unknown = {}, origin = "http://localhost:3001") => new Request(`http://localhost:3001/api/demo/${path}`, { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
it("demo endpoints are absent by default and require explicit server opt-in", async () => {
  delete process.env.CLOUDGUARD_DEMO_MODE;
  expect((await POST(request("login", "", { identity: "admin-a" }))).status).toBe(404);
  expect((await GET(new Request("http://localhost:3001/api/demo/state"))).status).toBe(404);
});
it("HTTP handlers bind approvals to opaque session identity and reject spoofing", async () => {
  process.env.CLOUDGUARD_DEMO_MODE = "true";
  async function login(identity: string) { const r = await POST(request("login", "", { identity, role: "infra-operator" })); expect(r.status).toBe(200); const header = r.headers.get("set-cookie")!; expect(header).toContain("HttpOnly"); expect(header).toContain("SameSite=Strict"); return header.split(";")[0]; }
  const a = await login("admin-a"), e = await login("employee"), b = await login("admin-b"); expect(a).not.toBe(b);
  await POST(request("reset", a));
  expect((await POST(request("restart", e, { role: "infra-operator", approved: true }))).status).toBe(403);
  expect((await POST(request("request", e))).status).toBe(202);
  expect((await POST(request("approve", e, { identity: "admin-b" }))).status).toBe(403);
  expect((await POST(request("approve", a))).status).toBe(200);
  expect((await POST(request("approve", a, { identity: "admin-b", approvals: 2 }))).status).toBe(409);
  expect((await POST(request("restart", e))).status).toBe(403);
  expect((await POST(request("approve", b))).status).toBe(200);
  expect((await POST(request("restart", e))).status).toBe(200);
  expect((await POST(request("reset", a, {}, "https://evil.example"))).status).toBe(403);
  expect((await POST(request("approve"))).status).toBe(401);
  const live = withAuth(async () => json({ shouldNeverRun: true }));
  expect((await live(new Request("http://localhost:3001/api/resources", { headers: { cookie: e } }))).status).toBe(401);
});
