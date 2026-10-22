import { DemoError, demoEngine } from "@/lib/demo/engine";
import { json } from "@/lib/auth/protect";
export const dynamic = "force-dynamic";
const cookieName = "cloudguard_demo";
function token(req: Request) { return req.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(cookieName + "="))?.slice(cookieName.length + 1); }
async function handle(req: Request) {
  if (process.env.CLOUDGUARD_DEMO_MODE !== "true") return json({ error: "Not found" }, 404);
  const action = new URL(req.url).pathname.split("/").slice(3).join("/");
  try {
    if (req.method === "GET") {
      if (action !== "state") return json({ error: "Not found" }, 404);
      return json(demoEngine.view(demoEngine.identify(token(req))));
    }
    if (req.headers.get("origin") !== new URL(req.url).origin) throw new DemoError(403, "Same-origin demo requests required.");
    if (!req.headers.get("content-type")?.startsWith("application/json")) throw new DemoError(415, "JSON required.");
    const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
    if (action === "login") {
      const body = await req.json();
      const session = demoEngine.login(body.identity);
      const r = json({ message: "Synthetic demo session started." });
      r.headers.set("Set-Cookie", `${cookieName}=${session}; Path=/api/demo; HttpOnly; SameSite=Strict; Max-Age=3600${secure}`);
      return r;
    }
    const person = demoEngine.identify(token(req));
    if (action === "logout") {
      demoEngine.logout(token(req)!);
      const r = json({ message: "Demo session ended." });
      r.headers.set("Set-Cookie", `${cookieName}=; Path=/api/demo; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
      return r;
    }
    const result = action === "request" ? demoEngine.request(person) : action === "approve" ? demoEngine.approve(person) : action === "restart" ? demoEngine.restart(person) : action === "reset" ? demoEngine.reset(person) : null;
    return result ? json(result, result.status) : json({ error: "Not found" }, 404);
  } catch (e) {
    return e instanceof DemoError ? json({ error: e.message }, e.status) : json({ error: "Invalid demo request." }, 400);
  }
}
export const GET = handle;
export const POST = handle;
