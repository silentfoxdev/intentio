"use strict";
const original = location.hash.slice(1);
let matched;
async function init() {
  const state = await send("getState");
  matched = IntentioCore.findMatch(state.rules, original, state.pausedRules);
  $("blockedUrl").textContent = original || "Address unavailable";
  $("matchedRule").textContent = matched ? `${matched.value} · ${IntentioCore.MODES[matched.mode]}` : "Rule unavailable";
  $("unblock").hidden = !matched || state.hideUnblockButton;
  if (matched) {
    await send("recordBlock", { id: matched.id, url: original });
    if (state.redirectEnabled && state.redirectTarget && !IntentioCore.findMatch(state.rules, state.redirectTarget, state.pausedRules)) {
      location.replace(state.redirectTarget);
    }
  }
}
init().catch(error => showMessage($("feedback"), error.message, true));
$("back").addEventListener("click", () => { if (history.length > 1) history.back(); else window.close(); });
$("settings").addEventListener("click", () => api.runtime.openOptionsPage());
$("unblock").addEventListener("click", async () => {
  if (!matched || !original) return;
  if (!(await requirePin("Enter your PIN to temporarily unblock this page"))) { showMessage($("feedback"), "Incorrect PIN or cancelled.", true); return; }
  try { await send("pauseRule", { id: matched.id, minutes: 10 }); location.replace(original); }
  catch (error) { showMessage($("feedback"), error.message, true); }
});
