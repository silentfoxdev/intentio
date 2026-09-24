"use strict";
const hints = {
  starts: "Block this address and its pages.",
  contains: "Block when the address contains this text.",
  ends: "Block when the address ends with this text.",
  exact: "Block only this exact address."
};
function renderPopup(state) {
  $("enabled").checked = state.isEnabled;
  $("status").textContent = state.isEnabled ? "Protection active" : "Protection paused";
  $("ruleCount").textContent = `${state.rules.length} ${state.rules.length === 1 ? "rule" : "rules"}`;
  const paused = state.rules.filter(rule => state.pausedRules[rule.id] > Date.now());
  $("pausedSection").hidden = paused.length === 0;
  $("pausedList").replaceChildren(...paused.map(rule => {
    const li = document.createElement("li");
    const name = document.createElement("span"); name.textContent = rule.value;
    const button = document.createElement("button"); button.className = "button small"; button.textContent = "Resume";
    button.addEventListener("click", async () => { await send("resumeRule", { id: rule.id }); await refreshPopup(); });
    li.append(name, button);
    return li;
  }));
}
async function refreshPopup() { renderPopup(await send("getState")); }
refreshPopup().catch(error => showMessage($("feedback"), error.message, true));
api.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  const value = tab && IntentioCore.canonicalUrl(tab.url);
  if (value && !$("ruleValue").value) $("ruleValue").value = value;
});
$("ruleMode").addEventListener("change", () => { $("ruleHint").textContent = hints[$("ruleMode").value]; });
$("addForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await send("addRule", { value: $("ruleValue").value, mode: $("ruleMode").value });
    showMessage($("feedback"), "Rule added. Open tabs have been updated.");
    await refreshPopup();
  } catch (error) { showMessage($("feedback"), error.message, true); }
});
$("enabled").addEventListener("change", async event => {
  const value = event.target.checked;
  try {
    if (!value && !(await requirePin("Enter your PIN to pause Intentio"))) throw new Error("Incorrect PIN or cancelled.");
    await send("setEnabled", { value });
    await refreshPopup();
  } catch (error) { event.target.checked = !value; showMessage($("feedback"), error.message, true); }
});
$("settings").addEventListener("click", () => { api.runtime.openOptionsPage(); window.close(); });
api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.rules || changes.pausedRules || changes.isEnabled)) refreshPopup();
});
