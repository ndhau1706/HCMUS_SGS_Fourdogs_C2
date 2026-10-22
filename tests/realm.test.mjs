import { describe, it, expect } from "vitest";
import { summarizeIdentities } from "../scripts/check-realm.mjs";

const admin = (identity) => ({
  username: "admin", enabled: true, tideKeyPresent: true, tideIdentity: identity,
  realmRoles: ["viewer"], managementRoles: ["tide-realm-admin"],
});
const employee = () => ({
  username: "cloudguard-employee", enabled: true, tideKeyPresent: true, tideIdentity: "employee-test-id",
  realmRoles: ["viewer"], managementRoles: [],
});
describe("read-only enrollment acceptance", () => {
  it("does not accept a user attribute as proof of a Tide IdP link", () => {
    const report = summarizeIdentities([admin(undefined)]);
    expect(report.adminRoleHolders).toBe(1);
    expect(report.enrolledAdminRoleHolders).toBe(0);
    expect(report.identityAndRolePreconditionsMet).toBe(false);
  });
  it("rejects three admin records sharing an identity", () => {
    const report = summarizeIdentities([admin("same"), admin("same"), admin("same"), employee()]);
    expect(report.enrolledAdminRoleHolders).toBe(3);
    expect(report.distinctEnrolledAdminIdentities).toBe(1);
    expect(report.identityAndRolePreconditionsMet).toBe(false);
  });
  it("rejects inherited employee operation or administration rights", () => {
    for (const extra of [{ realmRoles: ["viewer", "infra-operator"] }, { managementRoles: ["realm-admin"] }]) {
      expect(summarizeIdentities([admin("a"), admin("b"), admin("c"), { ...employee(), ...extra }]).identityAndRolePreconditionsMet).toBe(false);
    }
  });
  it("requires an enrolled employee distinct from all three admins", () => {
    const admins = [admin("a"), admin("b"), admin("c")];
    expect(summarizeIdentities(admins).identityAndRolePreconditionsMet).toBe(false);
    expect(summarizeIdentities([...admins, { ...employee(), tideIdentity: "a" }]).identityAndRolePreconditionsMet).toBe(false);
    const report = summarizeIdentities([...admins, employee()]);
    expect(report.identityAndRolePreconditionsMet).toBe(true);
    expect(JSON.stringify(report)).not.toContain("employee-test-id");
    expect(report).not.toHaveProperty("h2Complete");
  });
  it("does not accept disabled identities as ready for H2", () => {
    const admins = [admin("a"), admin("b"), admin("c")];
    expect(summarizeIdentities([...admins, { ...employee(), enabled: false }]).identityAndRolePreconditionsMet).toBe(false);
    expect(summarizeIdentities([{ ...admins[0], enabled: false }, ...admins.slice(1), employee()]).identityAndRolePreconditionsMet).toBe(false);
  });
});
