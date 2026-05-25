import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const banned = [
  ['enterprise', 'grade'].join('-'),
  ['production', 'ready'].join('-'),
  ['real-time', 'SOC'].join(' '),
  ['autonomous', 'exploitation'].join(' '),
  ['exploit', 'framework'].join(' '),
  ['compliance', 'certified'].join(' '),
  ['SOC', '2', 'compliant'].join(' '),
  ['ISO', '27001', 'certified'].join(' '),
  ['fully', 'live', 'production', 'platform'].join(' '),
  ['scanner', 'for', 'arbitrary', 'internet', 'targets'].join(' '),
];

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test('UI source avoids unsafe portfolio claims', () => {
  const srcDir = fileURLToPath(new URL('../src', import.meta.url));
  const content = files(srcDir).map((path) => readFileSync(path, 'utf8')).join('\n');
  for (const phrase of banned) {
    assert.equal(content.includes(phrase), false, `banned phrase found: ${phrase}`);
  }
});
