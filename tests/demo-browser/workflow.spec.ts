import { test, expect } from "@playwright/test";
test("real HTTP workflow with three isolated browser sessions and duplicate rejection", async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [employee, a, b] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    for (const [page, name] of [[employee, "Employee"], [a, "Admin A"], [b, "Admin B"]] as const) {
      await page.goto("http://localhost:3001/demo"); await page.getByRole("button", { name: new RegExp("^" + name) }).click();
    }
    await a.getByRole("button", { name: "Reset synthetic demo" }).click();
    await employee.reload(); await expect(employee.getByTestId("roles")).toHaveText("viewer");
    await employee.getByRole("button", { name: "Restart web-prod-01" }).click(); await expect(employee.getByTestId("response")).toContainText("HTTP 403");
    await employee.getByRole("button", { name: "Request infra-operator access" }).click(); await expect(employee.getByTestId("request-status")).toHaveText("PENDING");
    await a.getByRole("button", { name: "Refresh audit" }).click(); await a.getByRole("button", { name: "Approve request", exact: true }).click();
    await expect(a.getByTestId("approval-count")).toContainText("1 / 2");
    await a.getByRole("button", { name: "Approve request", exact: true }).click(); await expect(a.getByTestId("response")).toContainText("HTTP 409");
    await employee.getByRole("button", { name: "Restart web-prod-01" }).click(); await expect(employee.getByTestId("response")).toContainText("HTTP 403");
    await b.getByRole("button", { name: "Refresh audit" }).click(); await b.getByRole("button", { name: "Approve request", exact: true }).click();
    await expect(b.getByTestId("request-status")).toHaveText("AUTHORIZED");
    await employee.getByRole("button", { name: "Refresh audit" }).click(); await expect(employee.getByTestId("roles")).toContainText("infra-operator");
    await employee.getByRole("button", { name: "Restart web-prod-01" }).click(); await expect(employee.getByTestId("response")).toContainText("HTTP 200");
    await expect(employee.getByTestId("restart-count")).toHaveText("1"); await expect(employee.getByTestId("audit")).toContainText("grant.applied");
    expect((await contexts[0].request.get("http://localhost:3001/api/resources")).status()).toBe(401);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
