"use strict";
let state;
const modeLabels = IntentioCore.MODES;
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(selected, moveFocus = false) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    $(tab.getAttribute("aria-controls")).hidden = !active;
  }
  if (moveFocus) selected.focus();
}
for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", event => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : offset ? (tabs.indexOf(tab) + offset + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
}
function render() {
  if (!state) return;
  $("enabled").checked = state.isEnabled;
  $("enabledLabel").textContent = state.isEnabled ? "Active" : "Paused";
  $("ruleCount").textContent = state.rules.length;
  $("todayCount").textContent = state.dailyStats?.date === IntentioCore.todayKey() ? state.dailyStats.count : 0;
  $("totalCount").textContent = Object.values(state.blockStats || {}).reduce((sum, value) => sum + value, 0);
  $("redirectEnabled").checked = state.redirectEnabled;
  $("redirectRow").hidden = !state.redirectEnabled;
  $("redirectTarget").value = state.redirectTarget || "";
  $("hideUnblock").checked = state.hideUnblockButton;
  $("hideGemini").checked = state.hideGeminiResults;
  $("lockEnabled").checked = state.lockEnabled;
  $("changePin").hidden = !state.lockEnabled;
  const filter = $("search").value.toLowerCase();
  const visible = state.rules.filter(rule => `${rule.value} ${modeLabels[rule.mode]}`.toLowerCase().includes(filter));
  $("empty").hidden = state.rules.length > 0;
  $("rules").replaceChildren(...visible.map(rule => {
    const li = document.createElement("li"); li.className = "rule";
    const description = document.createElement("div"); description.className = "rule-description";
    const value = document.createElement("strong"); value.textContent = rule.value;
    const meta = document.createElement("span"); meta.className = "muted";
    const paused = state.pausedRules[rule.id] > Date.now();
    meta.textContent = `${modeLabels[rule.mode]} · ${state.blockStats[rule.id] || 0} blocks${paused ? " · Paused" : ""}`;
    description.append(value, meta);
    const controls = document.createElement("div"); controls.className = "actions";
    if (paused) {
      const resume = document.createElement("button"); resume.className = "button subtle small"; resume.textContent = "Resume";
      resume.addEventListener("click", () => act("resumeRule", { id: rule.id })); controls.append(resume);
    }
    const remove = document.createElement("button"); remove.className = "button danger small"; remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      if (!(await requirePin("Enter your PIN to remove this rule"))) return;
      await act("removeRule", { id: rule.id });
    });
    controls.append(remove); li.append(description, controls); return li;
  }));
}
async function refresh() { state = await send("getState"); render(); }
async function act(action, data = {}, feedback = $("listFeedback")) {
  try { const result = await send(action, data); await refresh(); showMessage(feedback, result.added !== undefined ? `${result.added} rules imported.` : "Changes saved."); return true; }
  catch (error) { showMessage(feedback, error.message, true); return false; }
}
refresh().catch(error => showMessage($("settingsFeedback"), error.message, true));
api.storage.onChanged.addListener((changes, area) => { if (area === "local") refresh(); });
$("search").addEventListener("input", render);
$("addForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (await act("addRule", { value: $("ruleValue").value, mode: $("ruleMode").value }, $("addFeedback"))) $("ruleValue").value = "";
});
$("enabled").addEventListener("change", async event => {
  const value = event.target.checked;
  if (!value && !(await requirePin("Enter your PIN to pause Intentio"))) { render(); return; }
  await act("setEnabled", { value }, $("settingsFeedback"));
});
$("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ version: 2, rules: state.rules.map(({ value, mode }) => ({ value, mode })) }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = "intentio-rules.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("import").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0]; event.target.value = "";
  if (!file || !(await requirePin("Enter your PIN to import rules"))) return;
  try {
    const json = JSON.parse(await file.text());
    const rules = Array.isArray(json) ? json : (json.rules || json.patterns);
    await act("importRules", { rules }, $("listFeedback"));
  } catch (error) { showMessage($("listFeedback"), `Invalid file: ${error.message}`, true); }
});
$("redirectEnabled").addEventListener("change", async event => {
  if (!(await requirePin("Enter your PIN to change the redirect"))) { render(); return; }
  if (event.target.checked && !state.redirectTarget) { $("redirectRow").hidden = false; return; }
  await api.storage.local.set({ redirectEnabled: event.target.checked });
});
$("saveRedirect").addEventListener("click", async () => {
  if (!(await requirePin("Enter your PIN to save the redirect"))) return;
  try {
    const url = new URL($("redirectTarget").value);
    if (!/^https?:$/.test(url.protocol)) throw new Error("Use an HTTP or HTTPS URL.");
    if (IntentioCore.findMatch(state.rules, url.href, state.pausedRules)) throw new Error("The redirect URL matches an active rule.");
    await api.storage.local.set({ redirectTarget: url.href, redirectEnabled: true });
    showMessage($("settingsFeedback"), "URL saved.");
  } catch (error) { showMessage($("settingsFeedback"), error.message, true); }
});
async function setPreference(key, value, feedback) {
  try {
    if (!(await requirePin("Enter your PIN to change this setting"))) { render(); return; }
    await api.storage.local.set({ [key]: value });
    await refresh();
    showMessage($(feedback), "Changes saved.");
  } catch (error) { render(); showMessage($(feedback), error.message, true); }
}
$("hideUnblock").addEventListener("change", event => setPreference("hideUnblockButton", event.target.checked, "settingsFeedback"));
$("hideGemini").addEventListener("change", event => setPreference("hideGeminiResults", event.target.checked, "wellbeingFeedback"));
$("lockEnabled").addEventListener("change", async event => {
  if (event.target.checked) { $("pinSetup").hidden = false; event.target.checked = false; $("newPin").focus(); return; }
  if (!(await requirePin("Enter your PIN to remove the lock"))) { render(); return; }
  await api.storage.local.set({ lockEnabled: false, lockPin: "" });
});
$("savePin").addEventListener("click", async () => {
  const pin = $("newPin").value;
  if (!/^\d{4,8}$/.test(pin) || pin !== $("confirmPin").value) { showMessage($("settingsFeedback"), "Enter the same 4–8 digit PIN twice.", true); return; }
  await api.storage.local.set({ lockEnabled: true, lockPin: await createPinHash(pin) });
  $("newPin").value = $("confirmPin").value = ""; $("pinSetup").hidden = true;
  showMessage($("settingsFeedback"), "PIN enabled.");
});
$("changePin").addEventListener("click", async () => {
  if (!(await requirePin("Enter your current PIN"))) return;
  $("pinSetup").hidden = false; $("newPin").focus();
});
$("resetStats").addEventListener("click", async () => {
  if (!(await requirePin("Enter your PIN to reset statistics"))) return;
  if (!confirm("Reset all statistics?")) return;
  await api.storage.local.set({ blockStats: {}, dailyStats: { date: "", count: 0 } });
});
