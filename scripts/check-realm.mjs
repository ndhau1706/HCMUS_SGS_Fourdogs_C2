// Read-only operator diagnostic. Never modifies policies or submits approvals.
import { pathToFileURL } from "node:url";

// Keep identity identifiers and contact information out of diagnostic output.
export function summarizeIdentities(users) {
  const enrolled = (user) =>
    Boolean(user.tideKeyPresent && user.tideIdentity);
  const admins = users.filter((user) => user.managementRoles.includes("tide-realm-admin"));
  const employee = users.find((user) => user.username === "cloudguard-employee");
  const identities = admins.filter(enrolled).map((user) => user.tideIdentity);
  const employeeReady = Boolean(
    employee && employee.enabled && enrolled(employee) && employee.realmRoles.includes("viewer") &&
    !employee.realmRoles.includes("infra-operator") && employee.managementRoles.length === 0,
  );
  return {
    adminRoleHolders: admins.length,
    enrolledAdminRoleHolders: admins.filter(enrolled).length,
    distinctEnrolledAdminIdentities: new Set(identities).size,
    adminEnrollment: admins.map((user) => ({
      enabled: user.enabled,
      tideUserKeyPresent: user.tideKeyPresent,
      tideIdpLinked: Boolean(user.tideIdentity),
    })),
    employee: employee ? {
      exists: true,
      enabled: employee.enabled,
      tideUserKeyPresent: employee.tideKeyPresent,
      tideIdpLinked: Boolean(employee.tideIdentity),
      viewer: employee.realmRoles.includes("viewer"),
      infraOperator: employee.realmRoles.includes("infra-operator"),
      managementPrivileges: employee.managementRoles.length > 0,
      distinctFromAdmins: enrolled(employee) && !identities.includes(employee.tideIdentity),
    } : { exists: false },
    identityAndRolePreconditionsMet: admins.length === 3 && admins.every((user) => user.enabled && enrolled(user)) &&
      new Set(identities).size === 3 && employeeReady && !identities.includes(employee.tideIdentity),
  };
}

export async function checkRealm() {
  const base = process.env.TIDECLOAK_URL || "http://localhost:8080",
    realm = process.env.REALM_NAME || "cloudguard";
  try {
    const r = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
      method: "POST",
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: process.env.KC_BOOTSTRAP_ADMIN_USERNAME || "admin",
        password: process.env.KC_BOOTSTRAP_ADMIN_PASSWORD || "",
      }),
    });
    if (!r.ok) throw new Error(`Operator authentication: HTTP ${r.status}`);
    let { access_token } = await r.json();
    let authenticatedAt = Date.now();
    async function get(path) {
      // Master tokens are short-lived. Refresh during larger read-only audits.
      if (Date.now() - authenticatedAt > 30000) {
        const refresh = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
          method: "POST",
          body: new URLSearchParams({
            client_id: "admin-cli", grant_type: "password",
            username: process.env.KC_BOOTSTRAP_ADMIN_USERNAME || "admin",
            password: process.env.KC_BOOTSTRAP_ADMIN_PASSWORD || "",
          }),
        });
        if (!refresh.ok) throw new Error(`Operator authentication: HTTP ${refresh.status}`);
        ({ access_token } = await refresh.json());
        authenticatedAt = Date.now();
      }
      const q = await fetch(
        `${base}/admin/realms/${encodeURIComponent(realm)}${path}`,
        { headers: { Authorization: `Bearer ${access_token}` } },
      );
      if (!q.ok)
        throw new Error(`Read-only realm diagnostic failed: HTTP ${q.status}`);
      return q.json();
    }
    const config = await get("");
    const roles = await get("/roles");
    const clients = await get("/clients?clientId=realm-management");
    const id = clients[0]?.id;
    if (!id) throw new Error("realm-management client is missing");
    const users = [];
    for (let first = 0; ; first += 100) {
      const page = await get(`/users?first=${first}&max=100`);
      users.push(...page);
      if (page.length < 100) break;
    }
    const identityState = [];
    for (const user of users) {
      const links = await get(`/users/${user.id}/federated-identity`);
      const realmRoles = await get(`/users/${user.id}/role-mappings/realm/composite`);
      const managementRoles = await get(`/users/${user.id}/role-mappings/clients/${id}/composite`);
      identityState.push({
        username: user.username,
        enabled: user.enabled === true,
        tideKeyPresent: Boolean(user.attributes?.tideUserKey?.[0]),
        tideIdentity: links.find((link) => link.identityProvider === "tide")?.userId,
        realmRoles: realmRoles.map((role) => role.name),
        managementRoles: managementRoles.map((role) => role.name),
      });
    }
    const identities = summarizeIdentities(identityState);
    const policy = await get("/iga/role-policies/name/tide-realm-admin");
    if (!Number.isInteger(policy.threshold) || policy.threshold < 1) {
      throw new Error("Signed admin policy threshold is unavailable");
    }
    const requests = await get("/iga/change-requests?status=PENDING");
    console.log(
      JSON.stringify(
        {
          realm,
          igaEnabled: config.attributes?.isIGAEnabled,
          attestor: config.attributes?.["iga.attestor"],
          requiredRealmRolesPresent: ["viewer", "infra-operator"].every((name) =>
            roles.some((role) => role.name === name),
          ),
          ...identities,
          signedAdminPolicyThreshold: policy.threshold,
          pendingRequests: Array.isArray(requests) ? requests.length : null,
          effectiveQuorum:
            "Verify the actual authorization threshold on a governed request in Tide Console; counts alone are not acceptance evidence.",
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkRealm();
}
