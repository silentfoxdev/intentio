# Chrome Web Store privacy submission notes

These answers describe the current `extension/` source. Review them against the exact version you upload. The public-facing policy is [`PRIVACY.md`](../PRIVACY.md); keep these publishing notes out of the policy URL.

## Privacy practices tab

| Field | Suggested answer |
| --- | --- |
| Single purpose | **Block websites chosen by the user with locally stored rules, and update open tabs when those rules change.** |
| Remote code | **No, I am not using remote code.** All executed JavaScript is packaged with the extension. |
| Privacy policy URL | `https://github.com/fabiomolignoni/intentio/blob/main/PRIVACY.md` once the repository and file are public. Open it in a signed-out browser before submitting. |

### Permission justifications

| Manifest entry | Text for the reviewer |
| --- | --- |
| `storage` | Stores user-created block rules, preferences, temporary pause times, local block counts, and the optional PIN hash on the device so blocking works across browser sessions. |
| `tabs` | Reads tab addresses to apply new or changed rules to already-open tabs, restore tabs when a rule is paused or removed, and prefill a rule from the active tab. |
| `declarativeNetRequest` | Installs browser-managed rules that redirect matching top-level navigations to Intentio's packaged block page before the site loads. |
| `alarms` | Ends temporary rule pauses at the time selected by the user. |
| `http://*/*` and `https://*/*` host permissions | Allows user-created rules to cover any HTTP or HTTPS website the user chooses. Intentio needs this scope to redirect matching pages to its local block page; it does not read page bodies. |

### Data usage disclosure

Select **Web history** (or **Web browsing activity** if that is the current label): Intentio inspects open and navigated page URLs locally, and rules may contain full URLs. Local-only processing still counts as handling user data under Google's policy. Do **not** select “no user data” merely because the developer receives no data.

Select **User activity** if the dashboard offers it: Intentio stores counts of blocked navigation events by rule and for the current or last recorded day. Select **Authentication information** if offered: the optional local PIN lock stores a salted PIN hash (or a legacy hash), even though the extension has no account sign-in. If the form separately offers **user-provided content**, disclose user-entered rule text and the optional redirect address there. These categories are conservative descriptions of data handled locally; the exact dashboard labels may differ.

The current extension does not read website content, form data, cookies, personal communications, payment information, or health information. Broad host permissions alone do not mean those data are read. Review the complete form before certifying, especially after any feature or manifest change.

Suggested explanation, if a free-text data-use field appears:

> Intentio locally compares tab URLs with user-created blocking rules, keeps rules and block counts in browser local extension storage, and optionally stores a hashed PIN and a user-chosen redirect URL. It has no developer server, analytics, or advertising. An optional redirect navigates the browser to a website chosen by the user.

The current implementation supports the Limited Use certifications: data is used for the disclosed blocking purpose, is not sold or transferred for advertising or credit decisions, and is not sent to the developer. The public policy contains an affirmative Limited Use statement. The Chrome Web Store listing should prominently describe that page addresses are checked to block sites and that custom redirect navigates to a user-chosen site when enabled.

## Before submitting

1. Publish the repository or another public copy of `PRIVACY.md`, verify the policy URL opens without signing in, and put that URL in the dashboard's privacy policy field.
2. Make sure the repository's GitHub Issues page is public and available as the policy contact. If it is not, replace the contact link in `PRIVACY.md` with a working public contact method.
3. Recheck the uploaded manifest and code against every permission and data-use answer. Update the policy and this guide if data handling changes.

## Sources and examples

- Google: [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [privacy policy requirement](https://developer.chrome.com/docs/webstore/program-policies/privacy), [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), and [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use).
- Open-source examples: [uBlock Origin's privacy policy](https://github.com/gorhill/ublock/wiki/Privacy-policy) clearly distinguishes extension behavior from external hosting and network access; [Dark Reader's privacy policy source](https://github.com/darkreader/darkreader.org/blob/main/www/privacy/index.html) describes browser storage and other separate services. Intentio's policy follows their clear, feature-specific style while explicitly disclosing its local URL processing, block-page address, and optional redirect.
