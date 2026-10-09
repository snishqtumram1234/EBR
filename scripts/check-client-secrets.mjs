#!/usr/bin/env node
/**
 * Fails the build if client code can reach a server secret.
 *
 * Rules:
 *  1. A file starting with "use client" may only read process.env.NEXT_PUBLIC_*.
 *  2. A "use client" file may not import server-only modules (env, admin/server
 *     Supabase clients, logger, payments).
 *  3. No file anywhere may name a secret with the NEXT_PUBLIC_ prefix, which
 *     would ship it to the browser.
 *  4. Secret variable names may not appear in client files at all.
 *
 * Transitive imports are additionally guarded by `import "server-only"` in
 * every server module, which makes `next build` fail if a client bundle pulls
 * one in.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "lib", "components", "hooks"];
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const SECRET_NAMES = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "CRON_SECRET",
];

const SERVER_ONLY_IMPORTS = [
  /["']@\/lib\/env["']/,
  /["']@\/lib\/supabase\/(admin|server|public)["']/,
  /["']@\/lib\/logger["']/,
  /["']@\/lib\/payments\//,
  /["']@\/lib\/data\//,
  /["']server-only["']/,
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

function isClientFile(source) {
  // Directive must be the first statement; allow leading comments/whitespace.
  const stripped = source.replace(/^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*/, "");
  return /^["']use client["']/.test(stripped);
}

const problems = [];

for (const file of SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, "utf8");

  for (const m of src.matchAll(/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE)[A-Z0-9_]*/g)) {
    problems.push(`${rel}: "${m[0]}" looks like a secret exposed with NEXT_PUBLIC_`);
  }

  if (!isClientFile(src)) continue;

  for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (!m[1].startsWith("NEXT_PUBLIC_")) {
      problems.push(`${rel}: client file reads process.env.${m[1]}`);
    }
  }
  if (/process\.env\[/.test(src)) {
    problems.push(`${rel}: client file reads process.env dynamically`);
  }
  for (const name of SECRET_NAMES) {
    if (src.includes(name)) problems.push(`${rel}: client file references ${name}`);
  }
  for (const pattern of SERVER_ONLY_IMPORTS) {
    if (pattern.test(src)) problems.push(`${rel}: client file imports server-only module ${pattern}`);
  }
}

if (problems.length) {
  console.error("Secret exposure check failed:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Secret exposure check passed.");
