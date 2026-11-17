// Bundled files are authenticated by their declaring parent archive. Their
// individual versions still pass the ordinary publication-age check.
export function assertRegistryProvenance(packagePath, entries) {
  const entry = entries[packagePath];
  if (!entry || typeof entry.version !== "string" || entry.link) throw new Error(`invalid lockfile entry: ${packagePath}`);
  if (entry.inBundle === true) {
    const marker = "/node_modules/";
    const boundary = packagePath.lastIndexOf(marker);
    const parentPath = packagePath.slice(0, boundary);
    const name = packagePath.slice(boundary + marker.length);
    const parent = entries[parentPath];
    if (boundary < 0 || !Array.isArray(parent?.bundleDependencies)
      || !parent.bundleDependencies.includes(name)) {
      throw new Error(`bundled dependency has no declaring parent: ${packagePath}`);
    }
    assertRegistryProvenance(parentPath, entries);
    return;
  }
  if (typeof entry.resolved !== "string"
    || !entry.resolved.startsWith("https://registry.npmjs.org/")) {
    throw new Error(`${packagePath} is not locked to the primary npm registry`);
  }
  if (typeof entry.integrity !== "string" || !entry.integrity.startsWith("sha512-")) {
    throw new Error(`${packagePath} lacks locked sha512 integrity`);
  }
}
