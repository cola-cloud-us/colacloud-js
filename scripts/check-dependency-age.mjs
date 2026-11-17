#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { assertRegistryProvenance } from "./lockfile-provenance.mjs";

const MINIMUM_AGE_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const NPM_REGISTRY = "https://registry.npmjs.org";
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const REQUEST_CONCURRENCY = 16;
const SECURITY_RELEASES = new Map();

function packageNameFromPath(packagePath) {
  return packagePath.slice(packagePath.lastIndexOf("node_modules/") + "node_modules/".length);
}

function validateDirectDependencies(manifest) {
  const invalid = [];
  for (const group of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, version] of Object.entries(manifest[group] ?? {})) {
      if (!EXACT_VERSION.test(version)) invalid.push(`${group}.${name}=${JSON.stringify(version)}`);
    }
  }
  if (invalid.length > 0) {
    throw new Error(`direct dependencies must use exact registry versions:\n${invalid.join("\n")}`);
  }
}

function lockedPackages(lockfile) {
  const packages = new Map();
  for (const [packagePath, entry] of Object.entries(lockfile.packages ?? {})) {
    if (packagePath === "" || typeof entry.version !== "string") continue;
    const name = packageNameFromPath(packagePath);
    assertRegistryProvenance(packagePath, lockfile.packages);
    packages.set(`${name}@${entry.version}`, { name, version: entry.version });
  }
  if (packages.size === 0) throw new Error("package-lock.json contains no registry packages");
  return [...packages.values()];
}

async function fetchPublication({ name, version }) {
  const encodedName = encodeURIComponent(name).replace(/^%40/, "@");
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${NPM_REGISTRY}/${encodedName}`, {
        headers: { Accept: "application/json", "User-Agent": "npm-dependency-age-policy/1" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`registry returned HTTP ${response.status}`);
      const publishedAtValue = (await response.json()).time?.[version];
      if (typeof publishedAtValue !== "string") throw new Error("missing publication timestamp");
      const publishedAt = new Date(publishedAtValue);
      if (Number.isNaN(publishedAt.valueOf())) throw new Error("invalid publication timestamp");
      return { name, version, publishedAt };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw new Error(`${name}@${version}: ${lastError.message}`);
}

async function mapConcurrent(values, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(REQUEST_CONCURRENCY, values.length) }, worker));
  return results;
}

async function main() {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const lockfile = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  validateDirectDependencies(manifest);
  const publications = await mapConcurrent(lockedPackages(lockfile), fetchPublication);
  const cutoff = new Date(Date.now() - MINIMUM_AGE_DAYS * MILLISECONDS_PER_DAY);
  const tooYoung = publications.filter(({ name, version, publishedAt }) =>
    publishedAt > cutoff && !(
      SECURITY_RELEASES.get(`${name}@${version}`) === publishedAt.toISOString()
      && publishedAt.valueOf() <= Date.now()
    ),
  );
  if (tooYoung.length > 0) {
    throw new Error(
      `locked dependencies must be published for ${MINIMUM_AGE_DAYS} full days:\n${tooYoung
        .sort((left, right) => right.publishedAt - left.publishedAt)
        .map(({ name, version, publishedAt }) => `  - ${name}@${version} published ${publishedAt.toISOString()}`)
        .join("\n")}`,
    );
  }
  const youngest = publications.reduce((latest, value) =>
    value.publishedAt > latest.publishedAt ? value : latest,
  );
  const ageDays = Math.floor((Date.now() - youngest.publishedAt) / MILLISECONDS_PER_DAY);
  console.log(
    `npm dependency policy passed: ${publications.length} locked versions; ` +
      `youngest is ${youngest.name}@${youngest.version} (${ageDays} full days old).`,
  );
}

main().catch((error) => {
  console.error(`dependency policy failed: ${error.message}`);
  process.exitCode = 1;
});
