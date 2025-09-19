#!/usr/bin/env node
/**
 * Theme enforcement script.
 * Scans src/ for disallowed raw colors & hardcoded Tailwind utility classes
 * that should be replaced by theme variables or palette usage.
 * Exits with code 1 if violations are found (unless --summary provided).
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const ALLOW_FILES = new Set([
  // Files allowed to contain raw colors (seed/theme editing logic)
  'ThemeSettingsView.tsx'.toLowerCase(),
]);

const HEX_REGEX = /#[0-9a-fA-F]{3,6}\b/g;
const BANNED_TW = /\b(bg-gray-|text-gray-|text-white|bg-white|bg-black|text-black)/g;

/** Recursively collect files */
function collect(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name.startsWith('.') || d.name === 'node_modules') return [];
    const full = join(dir, d.name);
    if (d.isDirectory()) return collect(full);
    if (!/\.(tsx?|css|mjs|jsx)$/.test(d.name)) return [];
    return [full];
  });
}

const files = collect(SRC);
const violations = [];

for (const file of files) {
  const base = file.split('/').pop().toLowerCase();
  const text = readFileSync(file, 'utf8');
  if (ALLOW_FILES.has(base)) continue;
  const hex = [...text.matchAll(HEX_REGEX)].map(m => m[0]).filter(h => !['#000', '#fff', '#000000', '#ffffff'].includes(h.toLowerCase()));
  const tw = [...text.matchAll(BANNED_TW)].map(m => m[0]);
  if (hex.length || tw.length) {
    violations.push({ file: file.replace(ROOT + '/', ''), hex, tw });
  }
}

if (violations.length) {
  console.log('\nTheme Enforcement Violations Found:');
  for (const v of violations) {
    console.log(`\n- ${v.file}`);
    if (v.hex.length) console.log('  Raw hex:', [...new Set(v.hex)].join(', '));
    if (v.tw.length) console.log('  Banned utilities:', [...new Set(v.tw)].join(', '));
  }
  if (!process.argv.includes('--summary')) {
    console.error(`\nTotal files with issues: ${violations.length}`);
    process.exit(1);
  }
} else {
  console.log('✅ Theme check passed (no raw colors or banned utilities).');
}
