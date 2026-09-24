const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../extension/core.js');

const cases = [
  ['starts', 'example.com', 'https://example.com/', true],
  ['starts', 'example.com', 'https://www.example.com/path', true],
  ['starts', 'example.com', 'https://example.com.evil/path', false],
  ['starts', 'example.com/path', 'https://example.com/path/next', true],
  ['ends', 'shorts', 'https://example.com/shorts', true],
  ['ends', '.example.com', 'https://foo.example.com/', true],
  ['contains', '/shorts', 'https://example.com/shorts/abc', true],
  ['exact', 'example.com', 'https://example.com/', true],
  ['exact', 'example.com', 'https://example.com/path', false],
  ['exact', 'example.com', 'https://example.com/?q=1', false],
  ['exact', 'example.com?x=1', 'https://example.com/?x=1', true],
  ['legacyExact', 'example.com', 'https://example.com/?q=1', true]
];
for (const [mode, value, url, expected] of cases) {
  test(`${mode}: ${value} → ${url}`, () => {
    const rule = { id: 'test', mode, value };
    assert.equal(core.matches(rule, url), expected);
    const regex = core.toDnrRegex(rule);
    if (regex) assert.equal(new RegExp(regex, 'i').test(url), expected, `DNR parity: ${regex}`);
  });
}
test('migration preserves old wildcard and regex syntax', () => {
  const old = core.migrateLegacy(['example.com', 'example.com/*', '*shorts*', 'foo*bar'], false);
  assert.deepEqual(old.map(rule => rule.mode), ['legacyExact', 'starts', 'contains', 'legacy']);
  assert.equal(core.matches(old[3], 'https://foobar/'), true);
  assert.equal(core.migrateLegacy(['^example\\.com'], true)[0].mode, 'legacyRegex');
});
test('pause skips one matching rule and considers the next', () => {
  const rules = [core.createRule('example.com', 'starts', 'a'), core.createRule('example.com', 'contains', 'b')];
  assert.equal(core.findMatch(rules, 'https://example.com/', { a: Date.now() + 60000 }).id, 'b');
});
test('rejects invalid and unsafe input', () => {
  for (const value of ['', 'https://user:pass@example.com', 'javascript:alert(1)', 'example.com/*']) {
    assert.throws(() => core.createRule(value, 'starts', 'x'));
  }
});
test('contains and ends preserve literal path fragments', () => {
  assert.equal(core.createRule('/shorts', 'contains', 'x').value, '/shorts');
  assert.equal(core.createRule('.example.com', 'ends', 'x').value, '.example.com');
  assert.equal(core.matches(core.createRule('/shorts', 'contains', 'x'), 'https://youtube.com/shorts'), true);
});
