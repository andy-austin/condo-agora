import { validateE164Phone, validateEmail } from "../../app/onboarding/lib/validation";

describe("validateE164Phone", () => {
  it("accepts valid E.164 phone numbers", () => {
    expect(validateE164Phone("+584121234567")).toBe(true);
    expect(validateE164Phone("+14155551234")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(validateE164Phone("04121234567")).toBe(false);
    expect(validateE164Phone("+58")).toBe(false);
    expect(validateE164Phone("not-a-phone")).toBe(false);
  });

  it("returns true for empty/undefined (optional field)", () => {
    expect(validateE164Phone(undefined)).toBe(true);
    expect(validateE164Phone("")).toBe(true);
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("a.b+tag@domain.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
  });

  it("returns true for empty/undefined (optional field)", () => {
    expect(validateEmail(undefined)).toBe(true);
    expect(validateEmail("")).toBe(true);
  });
});
