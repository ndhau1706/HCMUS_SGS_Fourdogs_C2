import { withRole, json } from "@/lib/auth/protect";
import { restart, audit, OperationError } from "@/lib/store";
export const POST = withRole("infra-operator", async (req, c) => {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return json({ error: "Cross-origin operation rejected." }, 403);
  const id = new URL(req.url).pathname.split("/")[3];
  try {
    const result = restart(
      c.sub!,
      id,
      req.headers.get("idempotency-key") || "",
    );
    audit({
      actor: c.sub!,
      resource: id,
      action: "synthetic.restart",
      outcome: result.replayed ? "replayed" : "allowed",
      status: 200,
    });
    return json({
      ...result,
      synthetic: true,
      message: result.replayed
        ? "Original result returned; no additional restart."
        : "Synthetic restart completed. No real infrastructure was contacted.",
    });
  } catch (e) {
    if (e instanceof OperationError) {
      audit({
        actor: c.sub!,
        resource: id,
        action: "synthetic.restart",
        outcome: "denied",
        status: e.status,
      });
      return json({ error: e.message }, e.status);
    }
    throw e;
  }
});
