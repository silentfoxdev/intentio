# Intentio Privacy Policy

Last updated: September 25, 2026

Intentio is a browser extension that blocks websites according to rules you choose. It works locally in Chrome and Firefox. There is no Intentio account, developer-operated server, advertising, analytics, or telemetry in the extension.

## Information Intentio uses

To decide whether to block a page, Intentio reads the addresses of open tabs and new page navigations and compares them with your rules. An address can include a domain, path, and query string. Intentio also reads the address of the active tab to help you add a rule from the popup. If you enable the Google AI Overview toggle, it checks heading labels on Google search result pages locally to identify the AI panel. It does not read form entries, cookies, or the contents of network requests and responses. It does not access your browser's history database.

Intentio stores the following in the browser's **local extension storage** on your device:

- Rules you add or import, which may contain domains or full addresses; whether blocking is enabled; and the end times of temporary rule pauses.
- The number of blocks for each rule and a count for the current or most recently recorded day. It does not keep a separate list of every page you visited or blocked.
- Your preferences, including an optional redirect address, whether the unblock button is shown, and whether Google AI Overview results are hidden.
- If you enable the optional PIN lock, a salted hash of the PIN (or a legacy hash from an earlier version), not the PIN itself. This lock is a self-control feature, not protection against someone who can access your browser profile or extension settings.

When a page is blocked, Intentio places the original address in the fragment of its local block-page URL so it can show that address and restore the tab when a rule is paused or removed. The address is visible in that tab and may remain in your browser's own history until you clear it there.

## How information is used and shared

Intentio uses these addresses, rules, settings, and counts only to block or restore pages, show the block page, manage temporary pauses, and display your statistics. The extension does not send them to the developer, sell them, use them for advertising or profiling, or share them with analytics services. It does not load or execute remote code.

When you enable the Google Search toggle, a content script uses the saved preference to hide matching AI Overview elements on Google search pages. To identify AI Overview panels, it compares result headings locally; it does not store or send their text. The toggle is off by default.

If you enable **custom redirect**, your browser navigates to the address you entered when a rule blocks a page. That website receives a normal browser request and handles it under its own privacy policy. Intentio does not intentionally add the blocked page's address to that request; information you put into the redirect address itself will be sent as part of the navigation. Custom redirect is off by default.

Importing rules reads only the file you select. Exporting rules creates a JSON file on your device. You decide whether to share that file elsewhere. If you contact the maintainer through GitHub, the information you submit there is handled by GitHub, outside the extension.

Intentio's use of information received from browser APIs complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use), including its Limited Use requirements. Browsing activity is used only for the page-blocking features described here.

## Retention and your controls

You can view and remove rules in Intentio's settings, reset block statistics there, change or remove the PIN, and turn off custom redirect. Rules, preferences, and counts remain in local extension storage until you change or delete them or remove the extension. The daily count is replaced when a block is recorded on a later day. Temporary pauses expire automatically. Removing the extension normally removes its local extension storage; browser-managed backups and browser history are controlled by your browser. Any exported file remains wherever you saved it until you delete it.

## Changes and contact

If Intentio's data practices change, this policy will be updated before the changed version is published. The date at the top identifies the latest version. For privacy questions, [open an issue in the Intentio repository](https://github.com/fabiomolignoni/intentio/issues). Please do not post sensitive addresses or your PIN in a public issue.
