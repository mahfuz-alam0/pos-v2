// Self-check for the package additionalCannabisProps name mapping.
// Run: npx jiti "src/app/inventory-management/packages/edit/[packageid]/cannabisProps.check.ts"
import assert from "node:assert/strict";

import { fromApiCannabisProps, toApiCannabisProps } from "./cannabisProps";

// --- the API vocabulary reaches the form ------------------------------------
{
  const props = fromApiCannabisProps({
    thc: 21.5,
    testCompletedDateString: "2026-02-10",
    harvestedDateString: "2026-01-04",
    manufacturedDateString: "2026-01-06",
    sellByDateString: "2026-06-01",
    useByDateString: "2026-07-01",
    totalMyrcene: 0.8,
    totalCBC: 1.2,
    thcCBDTestRange: "5-10",
    coaDocUrl: "https://x/coa.pdf",
    testQRLink: "https://x/qr.png",
  }) as Record<string, any>;

  assert.equal(props.thcContent, 21.5);
  assert.equal(props.testCompletedDate, "2026-02-10");
  assert.equal(props.harvestedDate, "2026-01-04");
  assert.equal(props.manufacturedDate, "2026-01-06");
  assert.equal(props.sellByDate, "2026-06-01");
  assert.equal(props.useByDate, "2026-07-01");
  assert.equal(props.myrcene, 0.8);
  assert.equal(props.cbcContent, 1.2);
  assert.equal(props.thcTestRangeMin, "5");
  assert.equal(props.thcTestRangeMax, "10");
  assert.equal(props.coaDocuments?.[0]?.url, "https://x/coa.pdf");
  assert.equal(props.testQrCodeDocuments?.[0]?.url, "https://x/qr.png");
}

// --- and the form's values go back out under the API names ------------------
{
  const api = toApiCannabisProps(
    {
      thcContent: 21.5,
      testCompletedDate: "2026-02-10",
      harvestedDate: "2026-01-04",
      myrcene: 0.8,
      thcTestRangeMin: 5,
      thcTestRangeMax: 10,
      coaDocuments: [{ url: "https://x/coa.pdf" }],
    } as never,
    null
  );

  assert.equal(api.thc, 21.5);
  assert.equal(api.testCompletedDateString, "2026-02-10");
  assert.equal(api.harvestedDateString, "2026-01-04");
  assert.equal(api.totalMyrcene, 0.8);
  assert.equal(api.thcCBDTestRange, "5-10");
  assert.equal(api.coaDocUrl, "https://x/coa.pdf");
  assert.equal(api.thcContent, undefined, "form-only names must not leak into the payload");
  assert.equal(api.harvestedDate, undefined, "form-only names must not leak into the payload");
}

// --- a save must not wipe fields the form never shows -----------------------
{
  const api = toApiCannabisProps({ thcContent: 1 } as never, {
    terpenes: "kept",
    testResultsURL: "https://x/results",
    thc: 99,
  });

  assert.equal(api.terpenes, "kept");
  assert.equal(api.testResultsURL, "https://x/results");
  assert.equal(api.thc, 1, "a field the form does manage must still win");
}

// --- round trip is stable ---------------------------------------------------
{
  const stored = {
    thc: 18,
    cbd: 2,
    harvestedDateString: "2026-01-04",
    testCompletedDateString: "2026-02-10",
    thcCBDTestRange: "5-10",
    totalLinalool: 0.3,
    terpenes: "kept",
  };
  const round = toApiCannabisProps(fromApiCannabisProps(stored) as never, stored);
  for (const [key, value] of Object.entries(stored)) {
    assert.equal(round[key], value, `round trip changed ${key}`);
  }
}

// --- METRC packages with no stored props fall back to the METRC snapshot ------
{
  const props = fromApiCannabisProps(null, {
    snapShotData: {
      metrcSnapshotData: {
        PackagedDate: "2026-07-13",
        LabTestingPerformedDate: "2026-07-03",
        Item: { UnitThcPercent: 22.4, UnitCbdPercent: 0.1 },
      },
    },
  }) as Record<string, any>;

  assert.equal(props.harvestedDate, "2026-07-13");
  assert.equal(props.testCompletedDate, "2026-07-03");
  assert.equal(props.thcContent, 22.4);
  assert.equal(props.testUom, "PERCENTAGE");
}

// stored props always win over the snapshot
assert.equal(
  (fromApiCannabisProps({ harvestedDateString: "2026-01-01" }, {
    snapShotData: { metrcSnapshotData: { PackagedDate: "2026-07-13" } },
  }) as Record<string, any>).harvestedDate,
  "2026-01-01"
);

// no props and no METRC data is still an empty form, not a crash
assert.equal((fromApiCannabisProps(null, null) as Record<string, any>).harvestedDate, undefined);

console.log("cannabisProps: all checks passed");
