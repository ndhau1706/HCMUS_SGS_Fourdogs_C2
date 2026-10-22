import type { JWTPayload } from "jose";
import { verifyTideJWT, hasRole, extractToken } from "./tideJWT";
import { ConfigurationError } from "./tidecloakConfig";
import { verifyDpop } from "./verifyDpop";
import { audit } from "../store";
type Handler = (req: Request, claims: JWTPayload) => Promise<Response>;
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function withAuth(handler: Handler) {
  return async (req: Request) => {
    let claims: JWTPayload;
    try {
      const token = extractToken(req.headers.get("authorization"));
      claims = await verifyTideJWT(token);
      await verifyDpop(req, token, claims as { cnf?: { jkt?: string } }, {
        trustForwardedHeaders: false,
      });
    } catch (error) {
      const status = error instanceof ConfigurationError ? 503 : 401;
      audit({
        actor: "unverified",
        resource: "api",
        action: "authentication",
        outcome: "denied",
        status,
      });
      return json(
        {
          error:
            status === 503
              ? "TideCloak is not configured. Complete realm setup."
              : "A valid Tide access token and fresh DPoP proof are required.",
        },
        status,
      );
    }
    try {
      return await handler(req, claims);
    } catch {
      return json({ error: "Operation unavailable. Please retry." }, 500);
    }
  };
}
export function withRole(role: string, handler: Handler) {
  return withAuth(async (req, claims) => {
    if (!hasRole(claims, role)) {
      audit({
        actor: claims.sub!,
        resource: new URL(req.url).pathname.split("/")[3] || "api",
        action: "restart",
        outcome: "denied",
        status: 403,
      });
      return json(
        {
          error: `Forbidden: ${role} realm role required. Request a governed grant in Tide Console, then sign in again.`,
        },
        403,
      );
    }
    return handler(req, claims);
  });
}
