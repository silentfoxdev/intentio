const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
function exists(relative) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `Missing extension asset: ${relative}`);
}
test('all manifest and page resources exist in the installable extension directory', () => {
  assert.equal(manifest.manifest_version, 3);
  for (const file of manifest.background.scripts) exists(file);
  exists(manifest.background.service_worker);
  exists(manifest.action.default_popup);
  exists(manifest.options_ui.page);
  for (const file of Object.values(manifest.icons)) exists(file);
  for (const file of manifest.web_accessible_resources.flatMap(group => group.resources)) exists(file);
  for (const page of ['popup.html', 'options.html', 'blocked.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /<html lang="en">/);
    for (const [, file] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (!/^[a-z]+:/i.test(file)) exists(file);
    }
  }
});
