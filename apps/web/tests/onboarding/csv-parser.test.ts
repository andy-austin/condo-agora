import { parseOnboardingCSV, type PropertyRow } from "../../app/onboarding/lib/csv-parser";

describe("parseOnboardingCSV", () => {
  it("parses valid CSV with all columns", () => {
    const csv = `property_name,first_name,last_name,phone,email
Apt 101,María,López,+584121234567,maria@example.com
Apt 102,Carlos,Pérez,+584141234567,`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      propertyName: "Apt 101",
      firstName: "María",
      lastName: "López",
      phone: "+584121234567",
      email: "maria@example.com",
    });
    expect(result.rows[1].email).toBe("");
    expect(result.error).toBeNull();
  });

  it("accepts 'property' as alias for 'property_name'", () => {
    const csv = `property,first_name,last_name,phone,email
Apt 101,María,López,+584121234567,maria@example.com`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].propertyName).toBe("Apt 101");
    expect(result.error).toBeNull();
  });

  it("returns error when property_name column is missing", () => {
    const csv = `first_name,last_name,phone,email
María,López,+584121234567,maria@example.com`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.error).toContain("property_name");
  });

  it("enforces 200 row max", () => {
    const header = "property_name,first_name,last_name,phone,email";
    const rows = Array.from({ length: 201 }, (_, i) => `Apt ${i + 1},,,,`);
    const csv = [header, ...rows].join("\n");

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.error).toContain("200");
  });

  it("skips empty rows", () => {
    const csv = `property_name,first_name,last_name,phone,email
Apt 101,María,López,,
,,,,
Apt 102,,,,`;

    const result = parseOnboardingCSV(csv);
    expect(result.rows).toHaveLength(2);
  });
});
