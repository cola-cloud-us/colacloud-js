import assert from "node:assert/strict";
import test from "node:test";
import { onlyReviewedTooling } from "./audit-build-tools.mjs";

function fixture() {
  const path = "node_modules/picomatch";
  const cause = {
    name: "picomatch", range: "<=4.0.7", severity: "high",
    url: "https://github.com/advisories/GHSA-fc5q-39xc-vjpf",
  };
  const report = {
    auditReportVersion: 2, metadata: { vulnerabilities: { total: 2 } },
    vulnerabilities: {
      picomatch: { name: "picomatch", severity: "high", nodes: [path], via: [cause] },
      vite: { name: "vite", severity: "high", nodes: ["node_modules/vite"], via: ["picomatch"] },
    },
  };
  const packages = { [path]: { dev: true, version: "4.0.7" }, "node_modules/vite": { dev: true } };
  return { path, cause, report, packages };
}

test("accepts only the reviewed dev dependency and its derived findings", () => {
  const { report, packages } = fixture();
  assert.equal(onlyReviewedTooling(report, packages), true);
});

for (const [reason, change] of [
  ["runtime copy", f => { delete f.packages[f.path].dev; }],
  ["unknown version", f => { f.packages[f.path].version = "0.0.0"; }],
  ["additional copy", f => { f.report.vulnerabilities.picomatch.nodes.push("node_modules/extra/node_modules/picomatch"); }],
  ["second advisory", f => { f.report.vulnerabilities.vite.via.push({ ...f.cause, url: "other" }); }],
  ["changed severity", f => { f.cause.severity = "critical"; }],
  ["changed range", f => { f.cause.range = "<4.0.7"; }],
  ["unresolved cause", f => { f.report.vulnerabilities.vite.via = ["absent"]; }],
  ["unrelated cycle", f => { f.report.vulnerabilities.vite.via = ["vite"]; }],
  ["incomplete report", f => { f.report.metadata.vulnerabilities.total++; }],
]) {
  test("blocks " + reason, () => {
    const f = fixture();
    change(f);
    assert.equal(onlyReviewedTooling(f.report, f.packages), false);
  });
}
