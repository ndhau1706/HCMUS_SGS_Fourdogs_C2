// Read-only operator diagnostic. Never modifies policies or submits approvals.
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
  const { access_token } = await r.json();
  async function get(path) {
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
  const holders = id
    ? await get(`/clients/${id}/roles/tide-realm-admin/users?max=100`)
    : [];
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
        adminRoleHolders: holders.length,
        enrolledAdminRoleHolders: holders.filter(
          (user) => user.attributes?.tideUserKey?.[0],
        ).length,
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
