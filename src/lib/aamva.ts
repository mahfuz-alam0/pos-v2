// AAMVA PDF417 driver's-license barcode parsing (ported from old POS).

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDLDate(raw) {
  if (!raw) return "";
  raw = String(raw).trim();
  if (/^\d{8}$/.test(raw)) {
    const mm = raw.slice(0, 2);
    const dd = raw.slice(2, 4);
    const yyyy = raw.slice(4, 8);
    if (parseInt(mm, 10) >= 1 && parseInt(mm, 10) <= 12) {
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return `${yyyy}-${mm}-${dd}`;
    }
    // YYYYMMDD fallback
    const y2 = raw.slice(0, 4);
    const m2 = raw.slice(4, 6);
    const d2 = raw.slice(6, 8);
    const alt = new Date(`${y2}-${m2}-${d2}T00:00:00`);
    if (!Number.isNaN(alt.getTime())) return `${y2}-${m2}-${d2}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return raw;
}

export function parseDLBarcode(raw) {
  if (!raw) return null;
  const fields: Record<string, string> = {};
  for (const line of raw.split(/\r\n|\n|\r/)) {
    const t = line.trim();
    if (t.length >= 4 && /^[A-Z]{3}/.test(t)) {
      fields[t.slice(0, 3)] = t.slice(3).trim();
    }
  }
  if (!fields.DAQ) {
    for (const val of Object.values(fields)) {
      const m = val.match(/DAQ([A-Z0-9]+)/);
      if (m) {
        fields.DAQ = m[1];
        break;
      }
    }
  }

  let firstName = "";
  let lastName = "";
  let middleName = "";
  if (fields.DCT) {
    firstName = fields.DCT.split(/,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
  } else if (fields.DAC) {
    const dadParts = (fields.DAD || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (dadParts.length >= 2) {
      firstName = [fields.DAC.trim(), dadParts[0]].filter(Boolean).join(" ");
      middleName = dadParts.slice(1, -1).join(" ");
      lastName = dadParts[dadParts.length - 1];
    } else {
      firstName = [fields.DAC.trim(), dadParts[0]].filter(Boolean).join(" ");
    }
  }
  if (!lastName) {
    if (fields.DCS) lastName = fields.DCS.trim();
    else if (fields.DAB) lastName = fields.DAB.trim();
  }
  if (!firstName && !lastName && fields.DAA) {
    const parts = fields.DAA.split("$");
    lastName = (parts[0] || "").trim();
    firstName = parts
      .slice(1)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
  }

  const data = {
    licenseId: (fields.DAQ || "").trim(),
    firstName,
    middleName,
    lastName,
    dob: formatDLDate(fields.DBB || ""),
    sex: fields.DBC === "2" ? "FEMALE" : "MALE",
    expiry: formatDLDate(fields.DBA || ""),
    address: (fields.DAG || "").trim(),
    city: (fields.DAI || "").trim(),
    state: (fields.DAJ || "").trim(),
    postal_code: (fields.DAK || "").replace(/[^0-9]/g, "").slice(0, 5),
  };

  if (data.firstName || data.lastName || data.licenseId) return data;
  return null;
}
