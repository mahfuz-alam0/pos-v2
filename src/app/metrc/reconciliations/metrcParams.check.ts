// Self-check for the METRC packages query params (tab semantics + sorting).
// Run: npx jiti src/app/metrc/reconciliations/metrcParams.check.ts
import assert from "node:assert/strict";

import { buildParams, type MetrcFilters, type MetrcSort } from "./metrcParams";

const base: MetrcFilters = { searchText: "", searchType: "metrcTags" };
const noSort: MetrcSort = { sortByAlpha: 0, sortByCreatedAt: 0 };
const params = (tab: any, filters: Partial<MetrcFilters> = {}, sort: MetrcSort = noSort) =>
  buildParams(tab, { ...base, ...filters }, 1, 30, sort);

// --- each tab asks for a different slice --------------------------------------
assert.equal(params("unFinish").isFinished, false);
assert.equal(params("unFinish").shouldRequiredToBeFinished, undefined);

// "Finish Packages" = still open but flagged as needing finishing. The old app
// sent isFinished:true here, making it a duplicate of the Finished tab.
assert.equal(params("finishPackages").isFinished, false);
assert.equal(params("finishPackages").shouldRequiredToBeFinished, true);

assert.equal(params("finishedPackages").isFinished, true);
assert.equal(params("finishedPackages").hasMETRCDiscrepancy, true);

assert.equal(params("conversions").isConverted, true);
assert.equal(params("conversions").isFinished, false);

// --- sorting -------------------------------------------------------------------
assert.equal(params("unFinish", {}, { sortByAlpha: 0, sortByCreatedAt: -1 }).sortByCreatedAt, -1);
assert.equal(params("unFinish", {}, { sortByAlpha: 1, sortByCreatedAt: 0 }).sortByAlpha, 1);
// a zeroed key must be omitted, not sent as 0
assert.equal(params("unFinish", {}, { sortByAlpha: 1, sortByCreatedAt: 0 }).sortByCreatedAt, undefined);
assert.equal(params("unFinish", {}, noSort).sortByAlpha, undefined);

// --- filters map onto the API's names ------------------------------------------
assert.equal(params("unFinish", { searchText: "1A4", searchType: "metrcTags" }).metrcTags, "1A4");
assert.equal(params("unFinish", { discrepancyFilter: "NO" }).hasNoMETRCDiscrepancy, true);
assert.equal(params("unFinish", { packageStatus: "pendingImport" }).isImported, false);
assert.equal(params("unFinish", { packageStatus: "isSample" }).isSample, true);
assert.equal(params("unFinish", { productProfile: "CANNABIS" }).packageType, "CANNABIS");
// display-only field must never reach the API
assert.equal(params("unFinish", { productBrandIds: "b1", productBrandName: "Acme" }).productBrandName, undefined);
assert.equal(params("unFinish", { productBrandIds: "b1", productBrandName: "Acme" }).productBrandIds, "b1");

console.log("metrcParams: all checks passed");
