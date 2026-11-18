# Dependency security

Use Node 24.22.1 and npm 12.0.2 for development, CI and release builds. Each npm
project has its own `.npmrc`; a nested package does not inherit its parent policy.
Run `npm ci --ignore-scripts`, then the explicitly reviewed build/test scripts.
Install hooks stay disabled. Do not bypass the release-age gate to unblock a
routine update.

All direct dependencies are exact versions. `npm run dependencies:age` verifies
registry/SHA512 provenance and at least seven full days since publication for
all locked packages, including optional platform variants. Bundled packages
inherit archive integrity from their declaring parent. An urgent security fix
may use an exact version-and-publication-time exception in that script after
review; do not reduce the global waiting period.

CI audits the entire lockfile, checks age and provenance, verifies registry
signatures/attestations, and runs type checks, tests and builds. The same workflow
runs daily so newly disclosed vulnerabilities fail even when source is unchanged.
Dependabot proposes grouped weekly updates with an eight-day cooldown (30 days
for majors). Audit failures must be triaged; do not use `npm audit fix --force`.

Registry signatures and provenance establish origin, not harmless behavior.
Review added packages and install/build scripts. Keep builds separate from
publication/deployment credentials. Checkout credentials are not persisted in CI.

## Reviewed build dependency

Runtime and full-lock audits block at moderate severity. The high-severity
[picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) affects
repository-controlled build and test globs. The SDK has no runtime npm dependencies.
While upstream has no patch, the audit annotates the reviewed development-only
copies. A new upstream latest release, a change in the advisory or dependency
exposure, or December 1, 2026 UTC requires fresh review. Keep the ordinary
runtime audit, provenance checks, and seven-day release age gate enabled.
