# Intentio

Intentio is a Chrome and Firefox extension for blocking pages you choose. Rules stay on your device. There are no accounts, telemetry, or developer-operated services.

Read the [privacy policy](PRIVACY.md) for details about local URL processing and the optional custom redirect.

## Install for development

- **Chrome 121+**: open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select the `extension/` directory.
- **Firefox 140+**: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `extension/manifest.json`.

The extension has no runtime dependencies or build step. Run `npm run check` with Node.js 20+ to check syntax and run tests.
The icon design lives in `scripts/generate-icons.js`. Run `npm run icons` to regenerate its SVG and toolbar PNGs.

## Rules

Enter a domain, URL, or fragment in the popup or settings, then choose a match type:

| Match type | Example | Effect |
| --- | --- | --- |
| Starts with | `example.com` | Blocks the homepage and paths on that domain; excludes `example.com.evil`. |
| Ends with | `shorts` | Blocks normalized addresses ending in that text. |
| Contains | `/shorts` | Blocks normalized addresses containing that text. |
| Exact match | `example.com` | Blocks only that domain's homepage. |

Matching ignores case, `http://`, `https://`, and the `www.` prefix. Paths and query strings can be part of a rule. Select a match type instead of entering `*`. Changes update both future navigations and open tabs. Removing or pausing a rule restores affected tabs from the block page to their original addresses.

Existing `blockedPatterns` are migrated on first launch. Simple wildcards become one of the new match types. Complex wildcards and JavaScript regular expressions remain imported rules. Regex rules that the browser cannot compile may be applied after navigation begins; recreate them with the four match types for reliable pre-navigation blocking.

## Architecture

- `extension/core.js` contains normalization, migration, and matching shared by the background and UI.
- `extension/background.js` owns rule writes, Manifest V3 dynamic rules, pause alarms, and open-tab reconciliation.
- `extension/popup.*`, `extension/options.*`, and `extension/blocked.*` are the three interfaces. `extension/theme.css` and `extension/ui.js` share styling and helpers.
- `tests/core.test.js` tests matching and migration.

New navigations are blocked with `declarativeNetRequest`. Browser limits apply to dynamic and regular-expression rules; Intentio accepts up to 500 rules. Chrome uses a service worker and Firefox uses background scripts under Manifest V3. The PIN is a self-control barrier, not security against someone with access to browser settings or developer tools. New PINs use PBKDF2, and hashes from earlier releases remain verifiable.

## Contributing

Open an issue with reproduction steps for bugs. Keep changes dependency-free at runtime, run `npm run check`, and describe behavior checked in Chrome and Firefox. Small, focused pull requests are easier to review.

## License

Mozilla Public License 2.0 (MPL-2.0). See [LICENSE](LICENSE).
