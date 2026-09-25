const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const buildChrome = require('../scripts/build-chrome');
const buildFirefox = require('../scripts/build-firefox');
const packageJson = require('../package.json');
const root = path.join(__dirname, '..', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
function exists(relative) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `Missing extension asset: ${relative}`);
}
test('all manifest and page resources exist in the installable extension directory', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, packageJson.version);
  assert.equal(Object.hasOwn(manifest.background, 'scripts'), false);
  assert.equal(Object.hasOwn(manifest, 'browser_specific_settings'), false);
  for (const script of manifest.content_scripts || []) {
    for (const file of [...(script.js || []), ...(script.css || [])]) exists(file);
  }
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

test('Chrome package copies the extension with a service worker', () => {
  const chromeRoot = buildChrome();
  const chromeManifest = JSON.parse(fs.readFileSync(path.join(chromeRoot, 'manifest.json'), 'utf8'));
  assert.deepEqual(chromeManifest, manifest);
  for (const file of ['background.js', 'popup.html', 'options.html', 'google-search.js', 'google-search.css']) {
    assert.equal(fs.readFileSync(path.join(chromeRoot, file), 'utf8'), fs.readFileSync(path.join(root, file), 'utf8'));
  }
});

test('Firefox package uses event-page scripts and declares Android compatibility', () => {
  const firefoxRoot = buildFirefox();
  const firefoxManifest = JSON.parse(fs.readFileSync(path.join(firefoxRoot, 'manifest.json'), 'utf8'));
  assert.equal(firefoxManifest.version, packageJson.version);
  assert.deepEqual(firefoxManifest.background.scripts, ['core.js', 'background.js']);
  assert.deepEqual(firefoxManifest.content_scripts, manifest.content_scripts);
  assert.equal(Object.hasOwn(firefoxManifest.background, 'service_worker'), false);
  assert.equal(Object.hasOwn(firefoxManifest, 'minimum_chrome_version'), false);
  assert.equal(firefoxManifest.browser_specific_settings.gecko.id, 'intentio@silentfox.dev');
  assert.equal(firefoxManifest.browser_specific_settings.gecko.strict_min_version, '140.0');
  assert.equal(firefoxManifest.browser_specific_settings.gecko_android.strict_min_version, '142.0');
  assert.deepEqual(firefoxManifest.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
  for (const file of firefoxManifest.background.scripts) {
    assert.equal(fs.existsSync(path.join(firefoxRoot, file)), true, `Missing Firefox background script: ${file}`);
  }
  assert.equal(fs.readFileSync(path.join(firefoxRoot, 'popup.css'), 'utf8'), fs.readFileSync(path.join(root, 'popup.css'), 'utf8'));
  for (const file of ['google-search.js', 'google-search.css']) {
    assert.equal(fs.readFileSync(path.join(firefoxRoot, file), 'utf8'), fs.readFileSync(path.join(root, file), 'utf8'));
  }
});
