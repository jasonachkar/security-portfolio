import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

/**
 * Phrases that would overclaim the project. Each is banned unless it appears in
 * a negated form. We scan
 * a small window before each match for a negation token, so the UI can state
 * its boundaries plainly without tripping the guard.
 */
const phrase = (...parts) => parts.join('');

const banned = [
  phrase('enterprise', '-grade'),
  phrase('production', '-ready'),
  phrase('production ', 'soc'),
  phrase('real-time ', 'soc'),
  phrase('autonomous ', 'exploitation'),
  phrase('exploit ', 'framework'),
  phrase('compliance ', 'certified'),
  phrase('compliance', '-certified'),
  phrase('soc 2 ', 'compliant'),
  phrase('iso 27001 ', 'certified'),
  phrase('arbitrary public ', 'targets'),
  phrase('arbitrary internet ', 'targets'),
  phrase('fully live production ', 'platform'),
];

const NEGATION_WINDOW = 48;
const NEGATION = /\b(?:not|never|no|without)\b/;

function findViolations(content) {
  const lower = content.toLowerCase();
  const violations = [];
  for (const phrase of banned) {
    let from = 0;
    let idx;
    while ((idx = lower.indexOf(phrase, from)) !== -1) {
      const before = lower.slice(Math.max(0, idx - NEGATION_WINDOW), idx);
      if (!NEGATION.test(before)) {
        violations.push(`${phrase} @ "...${lower.slice(Math.max(0, idx - 24), idx + phrase.length)}..."`);
      }
      from = idx + phrase.length;
    }
  }
  return violations;
}

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test('UI source avoids unsafe portfolio claims', () => {
  const srcDir = fileURLToPath(new URL('../src', import.meta.url));
  const content = files(srcDir)
    .filter((path) => /\.(ts|tsx|css)$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const violations = findViolations(content);
  assert.deepEqual(violations, [], `Unsafe (non-negated) overclaiming phrases found:\n${violations.join('\n')}`);
});

test('detector flags positive overclaims but allows negated wording', () => {
  // Guards against the checker silently becoming a no-op.
  const unsafeReady = phrase('production', '-ready');
  const unsafeTargets = phrase('arbitrary public ', 'targets');
  assert.ok(findViolations(`This is a ${unsafeReady} platform.`).length > 0, 'should flag a positive overclaim');
  assert.equal(findViolations(`This is not ${unsafeReady}.`).length, 0, 'should allow a negated claim');
  assert.equal(
    findViolations(`It is not a scanner for ${unsafeTargets}.`).length,
    0,
    'should allow a negated arbitrary-targets claim',
  );
});
