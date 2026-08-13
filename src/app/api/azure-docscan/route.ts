// Proxy to Azure AI Document Intelligence's prebuilt-idDocument model —
// replaces the PixLab docscan/medidscan routes. One model handles both
// driver's licenses and ID/med cards (auto-detected), so one route covers
// both modes. Analyze is async: the POST kicks off a run and hands back an
// Operation-Location URL that we poll until it's done.

const API_VERSION = "2024-11-30";
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 20;

function fieldValue(fields, name) {
  const f = fields?.[name];
  if (!f) return "";
  return f.valueString ?? f.valueDate ?? f.content ?? "";
}

// Azure's structured FirstName/LastName fields sometimes truncate
// multi-word names (seen on a real CA ID: field returned "JOSHUA JAMES",
// dropping the printed "QUINTANILLA") even though the underlying OCR read
// the full "FN JOSHUA JAMES QUINTANILLA" line correctly. When the raw text
// has that label line and it's a superset of what the field extracted,
// prefer the raw line.
function fullNameFromLabel(rawText, label, fieldValue) {
  const line = rawText?.split("\n").find((l) => new RegExp(`^${label}\\b`, "i").test(l.trim()));
  if (!line) return fieldValue;
  const value = line.trim().replace(new RegExp(`^${label}\\b[:\\s]*`, "i"), "").trim();
  if (value && value.toUpperCase().startsWith((fieldValue || "").toUpperCase())) return value;
  return fieldValue;
}

// Azure returns a structured valueAddress (city/state/postalCode as their
// own keys) instead of PixLab's single string that had to be regex-split.
function mapAddress(fields) {
  const addr = fields?.Address?.valueAddress;
  if (!addr) return { address: fieldValue(fields, "Address"), city: "", state: "", postal_code: "" };
  return {
    address: addr.streetAddress || [addr.houseNumber, addr.road].filter(Boolean).join(" "),
    city: addr.city || "",
    state: addr.state || "",
    postal_code: addr.postalCode || "",
  };
}

export async function POST(request) {
  try {
    const { img } = await request.json();
    const key = process.env.NEXT_AZURE_AI_DOCUMENT_INTELLIGENCE_KEY;
    const endpoint = process.env.NEXT_AZURE_AI_DOCUMENT_INTELLIGENCE_ENDPOINT;

    if (!img || !key || !endpoint) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const analyzeRes = await fetch(
      `${endpoint.replace(/\/$/, "")}/documentintelligence/documentModels/prebuilt-idDocument:analyze?api-version=${API_VERSION}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Ocp-Apim-Subscription-Key": key },
        body: JSON.stringify({ urlSource: img }),
      }
    );
    if (analyzeRes.status !== 202) {
      throw new Error(`Azure analyze request failed: ${analyzeRes.status} ${await analyzeRes.text()}`);
    }
    const opLocation = analyzeRes.headers.get("operation-location");
    if (!opLocation) throw new Error("Azure did not return an operation-location to poll");

    let result;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(opLocation, { headers: { "Ocp-Apim-Subscription-Key": key } });
      result = await pollRes.json();
      if (result.status === "succeeded" || result.status === "failed") break;
    }

    if (result?.status !== "succeeded") {
      throw new Error(result?.error?.message || "Azure analysis did not complete in time");
    }

    const fields = result.analyzeResult?.documents?.[0]?.fields || {};
    const rawText = result.analyzeResult?.content || "";
    const { address, city, state, postal_code } = mapAddress(fields);
    const documentNumber = fieldValue(fields, "DocumentNumber");

    const doc = {
      license_no: documentNumber,
      medical_license: documentNumber,
      first_name: fullNameFromLabel(rawText, "FN", fieldValue(fields, "FirstName")),
      last_name: fullNameFromLabel(rawText, "LN", fieldValue(fields, "LastName")),
      dob: fieldValue(fields, "DateOfBirth"),
      gender: fieldValue(fields, "Sex"),
      expiry_date: fieldValue(fields, "DateOfExpiration"),
      address,
      city,
      state,
      postal_code,
      country: fieldValue(fields, "CountryRegion"),
      issue_date: fieldValue(fields, "DateOfIssue"),
    };

    // Left in intentionally — the only way to tune the field mapping above
    // against real cards is seeing what Azure actually returned next to
    // what got extracted from it.
    console.log("[azure-docscan] raw fields:", JSON.stringify(fields, null, 2));
    console.log("[azure-docscan] raw OCR text:", rawText);
    console.log("[azure-docscan] extracted doc:", doc);

    return Response.json({ status: 200, doc });
  } catch (error) {
    console.error("Error calling Azure Document Intelligence:", error);
    return Response.json(
      { error: "Failed to process with Azure Document Intelligence", message: error.message },
      { status: 500 }
    );
  }
}
