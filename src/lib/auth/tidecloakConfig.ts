import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { JSONWebKeySet } from "jose";
export class ConfigurationError extends Error {}
export interface TidecloakConfig {
  realm: string;
  "auth-server-url": string;
  resource: string;
  "public-client": true;
  jwk: JSONWebKeySet;
  vendorId: string;
  homeOrkUrl: string;
  [field: string]: unknown;
}
export function loadTideConfig(): TidecloakConfig {
  try {
    const c = JSON.parse(
      process.env.CLIENT_ADAPTER ||
        readFileSync(join(process.cwd(), "data/tidecloak.json"), "utf8"),
    ) as TidecloakConfig;
    if (
      !c.realm ||
      c.realm === "master" ||
      !c.resource ||
      !c.vendorId ||
      !c.homeOrkUrl ||
      c["public-client"] !== true ||
      !c.jwk?.keys?.length
    )
      throw new Error();
    const url = new URL(c["auth-server-url"]);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ))
    )
      throw new Error();
    for (const key of c.jwk.keys) {
      if (
        !["EC", "OKP"].includes(key.kty!) ||
        ["d", "p", "q", "dp", "dq", "qi", "k"].some((k) => k in key)
      )
        throw new Error();
    }
    return c;
  } catch {
    throw new ConfigurationError(
      "TideCloak configuration unavailable. Complete realm setup.",
    );
  }
}
// Explicit allowlist: never serialize arbitrary adapter fields or operator credentials.
export function publicConfig(c: TidecloakConfig) {
  const fields = [
    "realm",
    "auth-server-url",
    "resource",
    "public-client",
    "ssl-required",
    "confidential-port",
    "jwk",
    "vendorId",
    "homeOrkUrl",
    "logoUrl",
    "backgroundUrl",
    "gVVK",
    "vvkId",
    "orkUrl",
    "payerPublic",
    "obfGVVK",
    "gVRKCertificate",
    "thresholdT",
    "thresholdN",
  ];
  // Tide's signed origin capabilities are public, origin-bound SDK inputs, not admin credentials.
  return Object.fromEntries(
    Object.entries(c).filter(
      ([name]) =>
        fields.includes(name) || /^client-origin-auth-https?:\/\//.test(name),
    ),
  );
}
