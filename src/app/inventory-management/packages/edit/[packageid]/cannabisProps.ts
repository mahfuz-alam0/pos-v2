import type { AdditionalCannabisProps } from "../../types";

// The API stores this block under its own vocabulary (`thc`, `harvestedDateString`,
// `totalMyrcene`, a single `coaDocUrl`, a `"min-max"` range string) while this form
// uses the friendlier names below. Translate at the two boundaries rather than
// renaming every input: reading and writing then stay in one place.
const API_KEY_BY_FORM_KEY = {
  thcContent: "thc",
  cbdContent: "cbd",
  thcaContent: "thca",
  cbdaContent: "cbda",
  testUom: "thcCbdTestType",
  totalPotentialPsychoactiveThc: "totalPotentialPsychoactiveTHCPercent",
  cbcContent: "totalCBC",
  cbnContent: "totalCBN",
  cbdvContent: "totalCBDV",
  cbgContent: "totalCBG",
  thcvContent: "totalTHCV",
  cbgaContent: "totalCBGA",
  myrcene: "totalMyrcene",
  alphaPinene: "totalAlphaPinene",
  betaPinene: "totalBetaPinene",
  alphaBisabolol: "totalAlphaBisabolol",
  terpinolene: "totalTerpinolene",
  limonene: "totalLimonene",
  humulene: "totalHumulene",
  caryophyllene: "totalCaryophyllene",
  linalool: "totalLinalool",
  testLab: "testLab",
  testLicense: "testLicense",
  testCompletedDate: "testCompletedDateString",
  manufacturedDate: "manufacturedDateString",
  harvestedDate: "harvestedDateString",
  sellByDate: "sellByDateString",
  useByDate: "useByDateString",
  packagedNetWeightInGrams: "packagedNetWeightInGrams",
} as const;

/** A METRC package usually has no stored props until someone saves this form, but
 *  METRC itself already carries the dates and potency in its snapshot. The old POS
 *  falls back to that snapshot, so mirror it or those packages show a blank form. */
function apiPropsFromMetrcSnapshot(snapshot: Record<string, any>): Record<string, any> {
  const item = snapshot.Item ?? {};
  const isPercent = item.UnitThcPercent || item.UnitCbdPercent;
  const isMilligram = item.UnitThcContent || item.UnitCbdContent;

  return {
    thc: item.UnitThcPercent ?? item.UnitThcContent ?? null,
    cbd: item.UnitCbdPercent ?? item.UnitCbdContent ?? null,
    thca: item.UnitThcAPercent ?? item.UnitThcAContent ?? null,
    cbda: item.UnitCbdAPercent ?? item.UnitCbdAContent ?? null,
    thcCbdTestType: isPercent ? "PERCENTAGE" : isMilligram ? "MILLIGRAM" : null,
    harvestedDateString: snapshot.PackagedDate ?? null,
    sellByDateString: snapshot.SellByDate ?? null,
    useByDateString: snapshot.UseByDate ?? null,
    testCompletedDateString:
      snapshot.LabTestingPerformedDate ?? snapshot.LabTestingRecordedDate ?? snapshot.DateTested ?? null,
  };
}

/** API shape -> the names this form reads (`props.X`). */
export function fromApiCannabisProps(
  apiProps: Record<string, any> | null | undefined,
  metrcData?: Record<string, any> | null
): AdditionalCannabisProps {
  const snapshot = metrcData?.snapShotData?.metrcSnapshotData;
  const api = apiProps ?? (snapshot ? apiPropsFromMetrcSnapshot(snapshot) : {});
  const props: Record<string, any> = {};
  for (const [formKey, apiKey] of Object.entries(API_KEY_BY_FORM_KEY)) {
    props[formKey] = api[apiKey] ?? undefined;
  }

  const [min, max] = String(api.thcCBDTestRange ?? "").split("-");
  props.thcTestRangeMin = min || undefined;
  props.thcTestRangeMax = max || undefined;

  // ponytail: the API keeps one URL per slot while the uploader accepts up to 3 —
  // only the first survives a save. Widen `coaDocUrl`/`testQRLink` to arrays if
  // storing all three ever matters.
  props.coaDocuments = api.coaDocUrl ? [{ url: api.coaDocUrl }] : [];
  props.testQrCodeDocuments = api.testQRLink ? [{ url: api.testQRLink }] : [];

  return props as AdditionalCannabisProps;
}

/** This form's names -> the API shape, layered over whatever is already stored so
 *  fields the form does not expose (terpenes, testResultsURL) survive a save. */
export function toApiCannabisProps(
  props: AdditionalCannabisProps,
  storedApiProps: Record<string, any> | null | undefined
): Record<string, any> {
  const api: Record<string, any> = { ...(storedApiProps ?? {}) };
  for (const [formKey, apiKey] of Object.entries(API_KEY_BY_FORM_KEY)) {
    api[apiKey] = (props as Record<string, any>)[formKey] ?? null;
  }

  const { thcTestRangeMin: min, thcTestRangeMax: max } = props;
  api.thcCBDTestRange = min != null && max != null ? `${min}-${max}` : null;

  api.coaDocUrl = props.coaDocuments?.[0]?.url ?? null;
  api.testQRLink = props.testQrCodeDocuments?.[0]?.url ?? null;

  return api;
}

