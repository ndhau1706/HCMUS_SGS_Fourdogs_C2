import { withAuth, json } from "@/lib/auth/protect";
import { realmRoles, hasRole } from "@/lib/auth/tideJWT";
import { loadTideConfig } from "@/lib/auth/tidecloakConfig";
export const GET = withAuth(async (_req, c) => {
  const config = loadTideConfig();
  return json({
    subject: c.sub,
    username:
      typeof c.preferred_username === "string" ? c.preferred_username : c.sub,
    roles: realmRoles(c),
    operator: hasRole(c, "infra-operator"),
    expiresAt: c.exp,
    issuer: c.iss,
    consoleUrl: `${config["auth-server-url"].replace(/\/+$/, "")}/realms/${encodeURIComponent(config.realm)}/tide-console/`,
    quorum: {
      verified: false,
      explanation:
        "Live quorum and approval state are available only in Tide Console. The intended demo policy is 2 approvals with 3 enrolled administrators.",
    },
  });
});
