const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../extension/google-search.js'), 'utf8');

function runOn(hostname, results = null) {
  const attributes = new Map();
  let resolveRead;
  let onChanged;
  let onMutation;
  let reads = 0;
  const context = {
    location: { hostname },
    document: {
      documentElement: {
        setAttribute: (key, value) => attributes.set(key, value),
        removeAttribute: key => attributes.delete(key)
      },
      querySelector: selector => selector === '#rcnt' ? results : null,
      querySelectorAll: () => results?.markedPanels || []
    },
    MutationObserver: class { constructor(callback) { onMutation = callback; } observe() {} disconnect() {} },
    clearTimeout,
    setTimeout,
    chrome: { storage: {
      local: { get: () => { reads++; return new Promise(resolve => { resolveRead = resolve; }); } },
      onChanged: { addListener: listener => { onChanged = listener; } }
    } },
    console
  };
  vm.runInNewContext(script, context);
  return { attributes, reads, resolveRead: value => resolveRead(value), change: (key, value, area = 'local') => onChanged({ [key]: { newValue: value } }, area), mutate: () => onMutation() };
}

test('Google search preference applies to country domains and live tabs', async () => {
  for (const hostname of ['www.google.com', 'www.google.it', 'www.google.co.uk', 'google.com.au']) {
    const page = runOn(hostname);
    assert.equal(page.reads, 1, hostname);
    page.resolveRead({ hideGeminiResults: true, hideAiMode: true });
    await Promise.resolve();
    assert.equal(page.attributes.get('data-intentio-hide-gemini'), 'true');
    assert.equal(page.attributes.has('data-intentio-hide-ai-mode'), false);
    page.change('hideGeminiResults', false);
    assert.equal(page.attributes.has('data-intentio-hide-gemini'), false);
    page.change('hideAiMode', true);
    assert.equal(page.attributes.has('data-intentio-hide-ai-mode'), false);
    assert.equal(page.attributes.has('data-intentio-hide-gemini'), false);
    page.change('hideGeminiResults', true, 'sync');
    assert.equal(page.attributes.has('data-intentio-hide-gemini'), false);
  }
});

test('a delayed initial read cannot override a newer toggle', async () => {
  const page = runOn('www.google.de');
  page.change('hideGeminiResults', true);
  page.resolveRead({ hideGeminiResults: false });
  await Promise.resolve();
  assert.equal(page.attributes.get('data-intentio-hide-gemini'), 'true');
});

test('the Google search script does not run on other sites', () => {
  for (const hostname of ['example.com', 'google.evil.com', 'mail.google.com']) {
    assert.equal(runOn(hostname).reads, 0, hostname);
  }
});

test('the Gemini scanner marks the answer block and reveals it when disabled', async () => {
  const panelAttributes = new Map();
  const panel = {
    id: '',
    parentElement: null,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ height: 280 }),
    hasAttribute: key => key === 'data-hveid',
    setAttribute: (key, value) => panelAttributes.set(key, value),
    removeAttribute: key => panelAttributes.delete(key)
  };
  const marker = { parentElement: panel };
  let generated = false;
  const results = { querySelectorAll: selector => selector.startsWith('#m-x-content') && generated ? [marker] : [], markedPanels: [panel] };
  const page = runOn('www.google.it', results);
  page.resolveRead({ hideGeminiResults: true });
  await Promise.resolve();
  assert.equal(panelAttributes.has('data-intentio-gemini-panel'), false);
  generated = true;
  page.mutate();
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(panelAttributes.get('data-intentio-gemini-panel'), 'true');
  assert.equal(page.attributes.get('data-intentio-hide-gemini'), 'true');
  page.change('hideGeminiResults', false);
  assert.equal(page.attributes.has('data-intentio-hide-gemini'), false);
  assert.equal(panelAttributes.has('data-intentio-gemini-panel'), false);
});
