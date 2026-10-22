// Operator-only, read-only diagnostic. Never prints raw billing data or credentials.
import { pathToFileURL } from "node:url";

const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const timestamp = (value) => Number.isSafeInteger(value) && value > 0 && value <= 253402300799
  ? new Date(value * 1000).toISOString() : null;

export function summarizeLicense(billing, details) {
  const quota = count(billing?.plan?.licences);
  const used = count(billing?.licencesInUse);
  const state = ["active", "inactive", "expired", "pending", "unlicensed"].includes(billing?.state)
    ? billing.state : null;
  return {
    state,
    free: typeof billing?.plan?.free === "boolean" ? billing.plan.free : null,
    licensedCapacity: quota,
    licensedUsersInUse: used,
    availableSeats: quota !== null && used !== null ? Math.max(0, quota - used) : null,
    overCapacity: quota !== null && used !== null ? used > quota : null,
    licenseDetailsUserCount: count(details?.currentUserAcc),
    licenseExpiryUtc: timestamp(details?.expiryDate),
    vrkExpiryUtc: timestamp(details?.vrkExpiry),
    allocationIdentities: "Not exposed by these APIs; local users are not a remote allocation roster.",
  };
}

export async function checkLicense() {
  const base = process.env.TIDECLOAK_URL || "http://localhost:8080";
  const realm = process.env.REALM_NAME || "cloudguard";
  if (!process.env.KC_BOOTSTRAP_ADMIN_PASSWORD) {
    console.error("Set the operator password in the ignored .env first.");
    process.exitCode = 1;
    return;
  }
  try {
    async function read(path) {
      // Refresh per request; remote billing calls may outlive an operator token.
      const login = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
        method: "POST",
        body: new URLSearchParams({
          client_id: "admin-cli", grant_type: "password",
          username: process.env.KC_BOOTSTRAP_ADMIN_USERNAME || "admin",
          password: process.env.KC_BOOTSTRAP_ADMIN_PASSWORD,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!login.ok) return { httpStatus: login.status, error: "operator-authentication" };
      const { access_token } = await login.json();
      if (!access_token) return { httpStatus: null, error: "operator-token-missing" };
      const response = await fetch(`${base}/admin/realms/${encodeURIComponent(realm)}/vendorResources/${path}`, {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(30000),
      });
      let body = null;
      try { body = JSON.parse(await response.text()); } catch { /* Empty/non-JSON means unknown. */ }
      return { httpStatus: response.status, body: response.ok ? body : null };
    }
    async function safelyRead(path) {
      try { return await read(path); }
      catch { return { httpStatus: null, error: "network-timeout-or-invalid-response" }; }
    }
    const billing = await safelyRead("billing/summary");
    const details = await safelyRead("getLicenseDetails");
    const report = summarizeLicense(billing.body, details.body);
    console.log(JSON.stringify({
      realm, observedAt: new Date().toISOString(),
      sources: {
        billingSummary: { httpStatus: billing.httpStatus, error: billing.error },
        licenseDetails: { httpStatus: details.httpStatus, error: details.error },
      },
      ...report,
    }, null, 2));
    if (report.state === null || report.licensedCapacity === null || report.licensedUsersInUse === null) {
      process.exitCode = 1;
    }
  } catch {
    console.error("License diagnostic failed; inspect private operator diagnostics. No raw response printed.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await checkLicense();
