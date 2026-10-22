import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
test("landing and all workspace navigation work without a fabricated identity", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Power to operate/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore workspace" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your infrastructure. Shared authority.",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Access governance", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Authority needs more than one voice." }),
  ).toBeVisible();
  await expect(page.getByText("NOT VERIFIED", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open real Tide Console" }),
  ).toHaveAttribute("href", /\/realms\/cloudguard\/tide-console\//);
  await page.getByRole("link", { name: "Activity logs", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every operation leaves a trace." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("live HTTP denies missing credentials on every protected API", async ({
  request,
}) => {
  for (const path of [
    "/api/session",
    "/api/resources",
    "/api/activity",
    "/api/resources/web-prod-01/health",
  ]) {
    const r = await request.get(path);
    expect(r.status()).toBe(401);
    expect(r.headers()["cache-control"]).toBe("no-store");
  }
  expect(
    (await request.post("/api/resources/web-prod-01/restart")).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/admin/grant-role", {
        data: { role: "infra-operator" },
      })
    ).status(),
  ).toBe(404);
});
test("official DPoP relay is served byte-exact with correct headers", async ({
  request,
}) => {
  const r = await request.get(
    "/tide_dpop/iss/6161/aud/6262/tide_dpop_auth.html",
  );
  expect(r.status()).toBe(200);
  expect(r.headers()["allow-csp-from"]).toBe("*");
  expect(r.headers()["content-security-policy"]).toBe(
    "default-src 'self'; script-src 'unsafe-inline'",
  );
  expect(
    createHash("sha256")
      .update(await r.body())
      .digest("hex"),
  ).toBe("9d7844b938f0a2565fa910d3d30e9b8797cbfd6e0b73d59d804169a089aea757");
});
test("public adapter endpoint exposes public fields only", async ({
  request,
}) => {
  const r = await request.get("/api/config");
  if (r.status() === 503) {
    expect(await r.text()).not.toContain("ENOENT");
    return;
  }
  expect(r.status()).toBe(200);
  const c = await r.json();
  expect(c["public-client"]).toBe(true);
  expect(c.jwk.keys.length).toBeGreaterThan(0);
  for (const field of [
    "credentials",
    "client-secret",
    "password",
    "access_token",
  ])
    expect(c).not.toHaveProperty(field);
});
test("mobile workspace stays within viewport and navigation is accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", {
      name: "Your infrastructure. Shared authority.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Access governance", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Authority needs more than one voice." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
