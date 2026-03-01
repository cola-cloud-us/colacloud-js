#!/usr/bin/env node
/**
 * Live smoke test for the colacloud JS/TS SDK.
 *
 * Exercises each SDK resource against the production API to verify
 * end-to-end functionality: client init, request/response parsing,
 * pagination iterators, and error handling.
 *
 * Usage:
 *   COLA_API_KEY=... node scripts/smoke_test.mjs
 *   COLA_API_KEY=... node scripts/smoke_test.mjs --base-url http://localhost:5001/api/v1
 *
 * Requires: npm run build (uses dist/ output)
 */

import { ColaCloud } from '../dist/index.mjs';

const args = process.argv.slice(2);
let baseUrl = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    baseUrl = args[i + 1];
    i++;
  }
}

const apiKey = process.env.COLA_API_KEY;
if (!apiKey) {
  console.error('Error: COLA_API_KEY environment variable is required');
  process.exit(1);
}

const config = { apiKey };
if (baseUrl) config.baseUrl = baseUrl;
const client = new ColaCloud(config);

const display = baseUrl || 'https://app.colacloud.us/api/v1';
console.log(`Smoke testing colacloud JS SDK against ${display}\n`);

const results = [];

async function check(name, fn) {
  const start = performance.now();
  try {
    const detail = await fn();
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const msg = `  OK  ${name} (${elapsed}s)${detail ? ` — ${detail}` : ''}`;
    results.push([true, msg]);
    console.log(msg);
  } catch (e) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    const msg = `FAIL  ${name} — ${e.constructor.name}: ${e.message} (${elapsed}s)`;
    results.push([false, msg]);
    console.log(msg);
  }
}

let ttbId = null;
let permitNumber = null;

// --- colas.list ---
await check('colas.list({ perPage: 1 })', async () => {
  const resp = await client.colas.list({ perPage: 1 });
  if (!resp.data?.length) throw new Error('expected at least one COLA');
  if (!resp.pagination?.total) throw new Error('expected total > 0');
  const cola = resp.data[0];
  if (!cola.ttb_id) throw new Error('expected ttb_id on COLA');
  ttbId = cola.ttb_id;
  return `total=${resp.pagination.total}, first=${ttbId}`;
});

// --- colas.get ---
await check(`colas.get(${ttbId})`, async () => {
  if (!ttbId) return 'skipped — no ttb_id from list';
  const cola = await client.colas.get(ttbId);
  if (cola.ttb_id !== ttbId) throw new Error(`expected ttb_id=${ttbId}`);
  if (!cola.product_type) throw new Error('expected product_type');
  return `ttb_id=${cola.ttb_id}, type=${cola.product_type}`;
});

// --- colas.list with search ---
await check('colas.list({ q: "bourbon" })', async () => {
  const resp = await client.colas.list({ q: 'bourbon', perPage: 5 });
  if (!resp.data) throw new Error('expected data array');
  return `found ${resp.data.length} results`;
});

// --- colas.iterate (take first item) ---
await check('colas.iterate({ q: "whiskey" })', async () => {
  for await (const cola of client.colas.iterate({ q: 'whiskey', perPage: 5 })) {
    if (!cola.ttb_id) throw new Error('expected ttb_id');
    return `first=${cola.ttb_id}`;
  }
  return 'no results (unexpected)';
});

// --- permittees.list ---
await check('permittees.list({ perPage: 1 })', async () => {
  const resp = await client.permittees.list({ perPage: 1 });
  if (!resp.data?.length) throw new Error('expected at least one permittee');
  const p = resp.data[0];
  if (!p.permit_number) throw new Error('expected permit_number');
  permitNumber = p.permit_number;
  return `total=${resp.pagination.total}, first=${permitNumber}`;
});

// --- permittees.get ---
await check(`permittees.get(${permitNumber})`, async () => {
  if (!permitNumber) return 'skipped — no permit_number from list';
  const p = await client.permittees.get(permitNumber);
  if (p.permit_number !== permitNumber)
    throw new Error(`expected permit_number=${permitNumber}`);
  return `permit=${p.permit_number}, company=${p.company_name}`;
});

// --- usage.get ---
await check('usage.get()', async () => {
  const usage = await client.usage.get();
  if (!usage.tier) throw new Error('expected tier');
  if (!usage.monthly_limit) throw new Error('expected monthly_limit');
  return `tier=${usage.tier}, used=${usage.requests_used}/${usage.monthly_limit}`;
});

// --- Summary ---
const total = results.length;
const passed = results.filter(([p]) => p).length;
const failed = total - passed;

console.log(`\n${'='.repeat(40)}`);
process.stdout.write(`  ${passed}/${total} passed`);
if (failed) {
  console.log(`, ${failed} failed`);
} else {
  console.log();
}

process.exit(failed === 0 ? 0 : 1);
