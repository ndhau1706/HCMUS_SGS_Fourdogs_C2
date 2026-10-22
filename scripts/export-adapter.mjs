import { mkdir, writeFile, rename } from "node:fs/promises";
const base = process.env.TIDECLOAK_URL || "http://localhost:8080";
const realm = process.env.REALM_NAME || "cloudguard";
const client = process.env.CLIENT_NAME || "cloudguard-client";
try {
  if (!process.env.KC_BOOTSTRAP_ADMIN_PASSWORD)
    throw new Error("Set the master admin password in the ignored .env first.");
  const login = await fetch(
    `${base}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: process.env.KC_BOOTSTRAP_ADMIN_USERNAME || "admin",
        password: process.env.KC_BOOTSTRAP_ADMIN_PASSWORD,
      }),
    },
  );
  if (!login.ok)
    throw new Error(`Master authentication failed: HTTP ${login.status}`);
  const { access_token } = await login.json();
  const headers = { Authorization: `Bearer ${access_token}` };
  const clients = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients?clientId=${encodeURIComponent(client)}`,
    { headers },
  );
  if (!clients.ok)
    throw new Error(`Client lookup failed: HTTP ${clients.status}`);
  const [{ id } = {}] = await clients.json();
  if (!id) throw new Error("CloudGuard client not found. Finish realm import.");
  const result = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/vendorResources/get-installations-provider?clientId=${id}&providerId=keycloak-oidc-keycloak-json`,
    { headers },
  );
  if (!result.ok)
    throw new Error(`Tide adapter export failed: HTTP ${result.status}`);
  const config = await result.json();
  if (
    !config.jwk?.keys?.length ||
    !config.vendorId ||
    !config.homeOrkUrl ||
    config["public-client"] !== true
  )
    throw new Error(
      "Incomplete Tide public-client adapter. Check licensing and QEA configuration.",
    );
  for (const key of config.jwk.keys)
    if (["d", "k", "p", "q"].some((field) => field in key))
      throw new Error("Refusing private key export.");
  await mkdir("data", { recursive: true });
  await writeFile(
    "data/tidecloak.json.tmp",
    JSON.stringify(config, null, 2) + "\n",
    { mode: 0o600 },
  );
  await rename("data/tidecloak.json.tmp", "data/tidecloak.json");
  console.log(
    "Genuine public Tide adapter saved locally to data/tidecloak.json. No administrator token saved. Restart or reload CloudGuard.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
