# Intentio

Intentio is a Chrome and Firefox extension for blocking pages you choose. Rules stay on your device. There are no accounts, telemetry, or developer-operated services.

Read the [privacy policy](PRIVACY.md) for details about local URL processing and the optional custom redirect.

## Install for development

- Run `npm run build` to populate `dist/chrome/` and `dist/firefox/` with versioned extension files.
- **Chrome 121+**: open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select the `dist/chrome/` directory.
- **Firefox desktop 140+**: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`.
- **Firefox for Android 142+**: use `web-ext run -t firefox-android --source-dir dist/firefox --adb-device DEVICE_ID --firefox-apk org.mozilla.firefox` with an Android device connected through ADB. The extension appears in Firefox's Add-ons menu; its popup opens over the current page.

The Chrome build uses a service worker. The Firefox build uses background scripts and includes desktop and Android metadata. The extension has no runtime dependencies. Run `npm run check` with Node.js 20+ to check syntax and run tests.
The icon design lives in `scripts/generate-icons.js`. Run `npm run icons` to regenerate its SVG and toolbar PNGs.
On Android, check the add-on from Firefox's menu: add a rule in the popup, visit a matching site, open settings, then pause the rule and confirm the original page loads again.

Settings has three tabs: **Blocking rules** for rules and statistics, **Digital wellbeing** for Google Search distraction controls, and **Options** for redirects, the temporary unblock button, the PIN, and resetting statistics. The optional **Hide Gemini answers in Google Search** control hides the AI Overview panel on Google search results. It is off by default and applies to open Google tabs as soon as the preference changes. Google can change its search markup, so the panel selectors may need updates over time.

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
- `extension/google-search.*` applies the optional Google search display preference on Google domains.
- `tests/core.test.js` tests matching and migration.

New navigations are blocked with `declarativeNetRequest`. Browser limits apply to dynamic and regular-expression rules; Intentio accepts up to 500 rules. Chrome uses a service worker and Firefox, including Android, uses background scripts under Manifest V3. Firefox desktop requires version 140+ and Firefox for Android requires version 142+ for the manifest's data collection declaration. The PIN is a self-control barrier, not security against someone with access to browser settings or developer tools. New PINs use PBKDF2, and hashes from earlier releases remain verifiable.

## Contributing

Open an issue with reproduction steps for bugs. Keep changes dependency-free at runtime, run `npm run check`, and describe behavior checked in Chrome and Firefox. Small, focused pull requests are easier to review.

## License

Mozilla Public License 2.0 (MPL-2.0). See [LICENSE](LICENSE).
