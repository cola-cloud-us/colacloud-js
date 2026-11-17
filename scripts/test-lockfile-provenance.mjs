import assert from "node:assert/strict";
import test from "node:test";
import { assertRegistryProvenance } from "./lockfile-provenance.mjs";

const parent = "node_modules/example";
const child = `${parent}/node_modules/@example/bundled`;
const fixture = () => ({
  [parent]: { version: "1.0.0", resolved: "https://registry.npmjs.org/example/-/example-1.0.0.tgz",
    integrity: "sha512-example", bundleDependencies: ["@example/bundled"] },
  [child]: { version: "1.0.0", inBundle: true },
});

test("declared bundled files inherit their parent archive integrity", () => {
  assert.doesNotThrow(() => assertRegistryProvenance(child, fixture()));
});
test("a top-level inBundle flag cannot bypass provenance", () => {
  assert.throws(() => assertRegistryProvenance("node_modules/forged", {
    "node_modules/forged": { version: "1.0.0", inBundle: true },
  }), /declaring parent/);
});
test("undeclared or missing parent bundles fail closed", () => {
  const entries = fixture();
  entries[parent].bundleDependencies = [];
  assert.throws(() => assertRegistryProvenance(child, entries), /declaring parent/);
  delete entries[parent];
  assert.throws(() => assertRegistryProvenance(child, entries), /declaring parent/);
});
test("parent registry, integrity and symlink restrictions still apply", () => {
  for (const change of [
    { resolved: "https://example.com/file.tgz" },
    { integrity: "sha1-weak" },
    { link: true },
  ]) {
    const entries = fixture();
    Object.assign(entries[parent], change);
    assert.throws(() => assertRegistryProvenance(child, entries));
  }
});
