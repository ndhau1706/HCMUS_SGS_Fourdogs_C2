import { describe, expect, it } from "vitest";
import { summarizeLicense } from "../scripts/check-license.mjs";

describe("remote license capacity reporting", () => {
  it("reports a full remote license without substituting the smaller local user count", () => {
    const report = summarizeLicense({ state: "active", plan: { free: true, licences: 5 }, licencesInUse: 5 }, { currentUserAcc: 5 });
    expect(report).toMatchObject({ state: "active", licensedCapacity: 5, licensedUsersInUse: 5, availableSeats: 0, free: true });
  });
  it("keeps empty, failed and partial responses unknown", () => {
    for (const body of [null, "", {}, { plan: { licences: 5 } }]) {
      expect(summarizeLicense(body, { currentUserAcc: 2 }).availableSeats).toBeNull();
    }
    expect(summarizeLicense(null, null).state).toBeNull();
  });
  it("does not accept strings, negative or fractional counts", () => {
    for (const value of ["5", -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(summarizeLicense({ plan: { licences: value }, licencesInUse: 1 }).licensedCapacity).toBeNull();
      expect(summarizeLicense({ plan: { licences: 5 }, licencesInUse: value }).availableSeats).toBeNull();
    }
  });
  it("preserves an over-capacity reading without reporting negative free seats", () => {
    expect(summarizeLicense({ plan: { licences: 5 }, licencesInUse: 6 })).toMatchObject({ availableSeats: 0, overCapacity: true });
    expect(summarizeLicense({ plan: { licences: 5 }, licencesInUse: 2 })).toMatchObject({ availableSeats: 3, overCapacity: false });
  });
  it("allowlists output so billing identities, links and keys never appear", () => {
    const privateValue = "sensitive-fixture";
    const report = summarizeLicense({ state: privateValue, publishableKey: privateValue, billingDetails: { email: privateValue }, subscriptionId: privateValue }, { vvkId: privateValue });
    expect(JSON.stringify(report)).not.toContain(privateValue);
    expect(report.state).toBeNull();
  });
  it("only converts valid expiry timestamps", () => {
    expect(summarizeLicense(null, { expiryDate: 1700000000 }).licenseExpiryUtc).toBe("2023-11-14T22:13:20.000Z");
    for (const value of [null, "1700000000", -1, Infinity, 253402300800]) {
      expect(summarizeLicense(null, { expiryDate: value }).licenseExpiryUtc).toBeNull();
    }
  });
});
