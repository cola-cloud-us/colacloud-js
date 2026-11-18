import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const advisory = "https://github.com/advisories/GHSA-fc5q-39xc-vjpf";
const reviewBy = Date.parse("2026-12-01T00:00:00Z");
const reviewedCopies = new Map([
  ["node_modules/picomatch", "4.0.7"],
]);

// npm v2 reports both direct advisories and the packages affected through them.
export function onlyReviewedTooling(report, packages) {
  const findings = Object.entries(report.vulnerabilities);
  const root = report.vulnerabilities.picomatch;
  if (report.auditReportVersion !== 2 || report.error || !root ||
      findings.length !== report.metadata.vulnerabilities.total) return false;

  if (root.via.length !== 1 || root.via[0].url !== advisory ||
      root.via[0].name !== "picomatch" || root.via[0].range !== "<=4.0.7" ||
      root.via[0].severity !== "high" ||
      !root.nodes.every(path => reviewedCopies.has(path) &&
        packages[path]?.version === reviewedCopies.get(path))) return false;

  for (const [name, finding] of findings) {
    if (finding.name !== name || finding.severity !== "high" || !finding.nodes.length ||
        !finding.nodes.every(path => packages[path]?.dev === true)) return false;
  }

  const reviewed = new Set(["picomatch"]);
  let previousSize;
  do {
    previousSize = reviewed.size;
    for (const [name, finding] of findings) {
      if (finding.via.length && finding.via.every(cause => reviewed.has(cause))) reviewed.add(name);
    }
  } while (reviewed.size !== previousSize);
  return reviewed.size === findings.length;
}

if (import.meta.main) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, "audit", "--json",
    "--include=dev", "--package-lock-only", "--audit-level=moderate"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.error) throw result.error;
  const report = JSON.parse(result.stdout);
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities ||
      !Number.isInteger(report.metadata?.vulnerabilities?.total)) {
    throw new Error("npm returned an invalid audit report: " + result.stdout);
  }
  if (result.status === 0) {
    console.log("npm full-lock audit passed the moderate severity threshold.");
  } else {
    console.log(result.stdout);
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    if (result.status !== 1 || Date.now() >= reviewBy || !onlyReviewedTooling(report, lock.packages)) {
      throw new Error("Dependency findings need review.");
    }
    const response = await fetch("https://registry.npmjs.org/picomatch/latest", {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Could not verify the latest picomatch release.");
    const latest = await response.json();
    if (latest.name !== "picomatch" || latest.version !== "4.0.7") {
      throw new Error("Upstream picomatch release changed. Recheck the advisory and the lockfile.");
    }
    console.warn("::warning::Reviewed development-only picomatch advisory GHSA-fc5q-39xc-vjpf. Review by 2026-12-01 UTC.");
  }
}
