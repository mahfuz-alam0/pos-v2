// Proxy to PixLab docscan (avoids CORS) — ported from old POS pages/api.

function processFullName(fullName) {
  if (!fullName) return { first_name: "", last_name: "" };

  if (fullName.includes(",")) {
    const [lastName, firstName] = fullName.split(",").map((part) => part.trim());
    return { first_name: firstName, last_name: lastName };
  }

  const suffixPattern = /\s+(Jr\.?|Sr\.?|I{1,3}|IV|V|VI)$/i;
  let suffix = "";
  let nameWithoutSuffix = fullName;
  const suffixMatch = fullName.match(suffixPattern);
  if (suffixMatch) {
    suffix = suffixMatch[0];
    nameWithoutSuffix = fullName.replace(suffix, "").trim();
  }

  const parts = nameWithoutSuffix.split(" ").filter((part) => part.trim() !== "");
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };

  const lastName = parts.pop() + (suffix || "");
  const firstName = parts.join(" ");
  return { first_name: firstName, last_name: lastName };
}

function extractCityStateZip(doc, address) {
  if (!address) return;
  const addressParts = address.split(",");
  if (addressParts.length >= 2) {
    const stateZipPart = addressParts[addressParts.length - 1].trim();
    const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
    if (stateZipMatch) {
      doc.state = stateZipMatch[1];
      doc.postal_code = stateZipMatch[2];
    }
    doc.city = addressParts[addressParts.length - 2].trim();
  }
}

export async function POST(request) {
  try {
    const { img, type, country, pixlabApiKey } = await request.json();
    const key = pixlabApiKey || process.env.PIXLAB_API_KEY;

    if (!img || !type || !country || !key) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const pixlabRes = await fetch("https://api.pixlab.io/docscan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ img, type, country, key }),
    });
    const responseData = await pixlabRes.json();

    if (responseData && responseData.status === 200) {
      const processedData = { status: responseData.status, doc: {} };

      if (responseData.fields) {
        const fields = responseData.fields;
        const { first_name, last_name } = processFullName(fields.fullName);

        processedData.doc = {
          license_no: fields.documentNumber || "",
          first_name,
          last_name,
          full_name: fields.fullName || "",
          dob: fields.dateOfBirth || "",
          gender: "",
          expiry_date: fields.expiryDate || "",
          address: fields.address || "",
          state: fields.issuingState || "",
          country: fields.issuingCountry || "",
          issue_date: fields.issuingDate || "",
        };
        extractCityStateZip(processedData.doc, fields.address);
      }

      return Response.json(processedData);
    }

    return Response.json(responseData);
  } catch (error) {
    console.error("Error proxying to PIXLAB:", error);
    return Response.json(
      { error: "Failed to process with PIXLAB", message: error.message },
      { status: 500 }
    );
  }
}
