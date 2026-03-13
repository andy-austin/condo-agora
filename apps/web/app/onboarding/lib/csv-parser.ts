import Papa from "papaparse";

const MAX_ROWS = 200;
const PROPERTY_COLUMN = "property_name";
const PROPERTY_ALIAS = "property";

export interface PropertyRow {
  id: string;
  propertyName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface ParseResult {
  rows: PropertyRow[];
  error: string | null;
}

export function parseOnboardingCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { rows: [], error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  const headers = parsed.meta.fields || [];
  const hasPropertyCol =
    headers.includes(PROPERTY_COLUMN) || headers.includes(PROPERTY_ALIAS);

  if (!hasPropertyCol) {
    return {
      rows: [],
      error:
        "Missing required column: property_name (or property). Please check your CSV format.",
    };
  }

  const dataRows = parsed.data.filter((row) => {
    const name = row[PROPERTY_COLUMN] || row[PROPERTY_ALIAS] || "";
    return name.trim() !== "";
  });

  if (dataRows.length > MAX_ROWS) {
    return {
      rows: [],
      error: `CSV has ${dataRows.length} rows, maximum is ${MAX_ROWS}.`,
    };
  }

  const rows: PropertyRow[] = dataRows.map((row, index) => ({
    id: `csv-${index}`,
    propertyName: (row[PROPERTY_COLUMN] || row[PROPERTY_ALIAS] || "").trim(),
    firstName: (row["first_name"] || "").trim(),
    lastName: (row["last_name"] || "").trim(),
    phone: (row["phone"] || "").trim(),
    email: (row["email"] || "").trim(),
  }));

  return { rows, error: null };
}
