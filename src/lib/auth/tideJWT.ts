import { verifyTideCloakToken } from "@tidecloak/verify";
import type { JWTPayload } from "jose";
import { loadTideConfig, type TidecloakConfig } from "./tidecloakConfig";
export async function verifyTideJWT(
  token: string,
  config: TidecloakConfig = loadTideConfig(),
): Promise<JWTPayload> {
  if (!config.jwk?.keys?.length) throw new Error("Missing pinned keys");
  const claims = await verifyTideCloakToken(
    { ...config, clockTolerance: 0 },
    token,
  );
  if (!claims) throw new Error("Invalid access token");
  const now = Date.now() / 1000;
  if (
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60 ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    !["Bearer", "DPoP"].includes(String(claims.typ))
  )
    throw new Error("Invalid access token claims");
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(config.resource)) throw new Error("Wrong audience");
  return claims as JWTPayload;
}
export function realmRoles(claims: JWTPayload): string[] {
  const roles = (claims.realm_access as { roles?: unknown })?.roles;
  return Array.isArray(roles)
    ? roles.filter((r): r is string => typeof r === "string")
    : [];
}
export function hasRole(claims: JWTPayload, role: string) {
  return realmRoles(claims).includes(role);
}
export function extractToken(header: string | null) {
  const match = header?.match(/^(?:DPoP|Bearer) ([^\s]+)$/i);
  if (!match || match[1].length > 24000)
    throw new Error("Missing or malformed access token");
  return match[1];
}
