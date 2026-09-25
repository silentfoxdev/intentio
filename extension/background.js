"use strict";
if (typeof IntentioCore === "undefined") importScripts("core.js");
const api = globalThis.browser || globalThis.chrome;
const BLOCKED = api.runtime.getURL("blocked.html");
const PAUSE_ALARM = "pause-expiry";
const defaults = { rules: [], isEnabled: true, pausedRules: {}, blockStats: {}, dailyStats: { date: "", count: 0 }, redirectEnabled: false, redirectTarget: "", hideUnblockButton: false, hideGeminiResults: false, lockEnabled: false, lockPin: "" };
let updateQueue = Promise.resolve();
let refreshPending = false;

async function settings() {
  return api.storage.local.get(defaults);
}

async function migrate() {
  const saved = await api.storage.local.get({ rules: null, blockedPatterns: [], regexMode: false, pausedPatterns: {}, blockStats: {} });
  if (Array.isArray(saved.rules)) return;
  const rules = IntentioCore.migrateLegacy(saved.blockedPatterns, saved.regexMode);
  const pausedRules = {};
  const blockStats = {};
  const oldPatterns = saved.blockedPatterns.filter(value => typeof value === "string" && value.trim()).map(value => value.trim());
  for (const rule of rules) {
    const oldPattern = oldPatterns[Number(rule.id.slice(7))];
    const old = saved.pausedPatterns[oldPattern];
    if (old > Date.now()) pausedRules[rule.id] = old;
    if (saved.blockStats[oldPattern]) blockStats[rule.id] = saved.blockStats[oldPattern];
  }
  await api.storage.local.set({ rules, pausedRules, blockStats });
}

function blockedUrl(url) { return `${BLOCKED}#${url}`; }
function originalFromBlocked(url) { return url.startsWith(BLOCKED + "#") ? url.slice(BLOCKED.length + 1) : null; }

async function syncDnr(state) {
  const existing = await api.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(rule => rule.id);
  const addRules = [];
  if (state.isEnabled) {
    for (const rule of state.rules) {
      if (addRules.length >= 500) break;
      if (state.pausedRules[rule.id] > Date.now()) continue;
      const regexFilter = IntentioCore.toDnrRegex(rule);
      if (!regexFilter) continue; // Imported JavaScript regex rules use the tab fallback.
      const support = await api.declarativeNetRequest.isRegexSupported({ regex: regexFilter, isCaseSensitive: false });
      if (!support.isSupported) continue;
      addRules.push({
        id: addRules.length + 1,
        priority: state.rules.length - state.rules.indexOf(rule),
        action: { type: "redirect", redirect: { regexSubstitution: `${BLOCKED}#\\0` } },
        condition: { regexFilter, isUrlFilterCaseSensitive: false, resourceTypes: ["main_frame"] }
      });
    }
  }
  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function schedulePauseAlarm(pausedRules) {
  await api.alarms.clear(PAUSE_ALARM);
  const next = Object.values(pausedRules).filter(time => time > Date.now()).sort((a, b) => a - b)[0];
  if (next) api.alarms.create(PAUSE_ALARM, { when: next });
}

async function reconcileTabs(state) {
  const tabs = await api.tabs.query({});
  await Promise.all(tabs.map(async tab => {
    if (!tab.id || !tab.url) return;
    const original = originalFromBlocked(tab.url);
    const url = original || tab.url;
    const rule = state.isEnabled ? IntentioCore.findMatch(state.rules, url, state.pausedRules) : null;
    try {
      if (original && !rule) await api.tabs.update(tab.id, { url: original });
      else if (!original && rule) await api.tabs.update(tab.id, { url: blockedUrl(url) });
    } catch { /* A tab may close or disallow navigation while the scan runs. */ }
  }));
}

async function refresh() {
  await migrate();
  const state = await settings();
  await syncDnr(state);
  await schedulePauseAlarm(state.pausedRules);
  await reconcileTabs(state);
}
function queueRefresh() {
  if (refreshPending) return updateQueue;
  refreshPending = true;
  updateQueue = updateQueue.then(async () => {
    refreshPending = false;
    await refresh();
  }).catch(error => console.error("Intentio: failed to update rules", error));
  return updateQueue;
}

api.runtime.onInstalled.addListener(queueRefresh);
api.runtime.onStartup.addListener(queueRefresh);
api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ["rules", "isEnabled", "pausedRules", "redirectEnabled", "redirectTarget"].some(key => changes[key])) queueRefresh();
});
api.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== PAUSE_ALARM) return;
  const { pausedRules } = await api.storage.local.get({ pausedRules: {} });
  const active = Object.fromEntries(Object.entries(pausedRules).filter(([, time]) => time > Date.now()));
  await api.storage.local.set({ pausedRules: active });
  queueRefresh();
});

// A fallback for legacy JavaScript regex rules, which cannot all be compiled by DNR.
api.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url || !/^https?:/.test(changeInfo.url)) return;
  const state = await settings();
  if (!state.isEnabled) return;
  const rule = IntentioCore.findMatch(state.rules, changeInfo.url, state.pausedRules);
  if (!rule) return;
  try { await api.tabs.update(tabId, { url: blockedUrl(changeInfo.url) }); }
  catch { /* Tab no longer exists. */ }
});

let statsQueue = Promise.resolve();
function recordBlock(ruleId) {
  statsQueue = statsQueue.then(async () => {
    const saved = await api.storage.local.get({ blockStats: {}, dailyStats: { date: "", count: 0 } });
    const blockStats = { ...saved.blockStats, [ruleId]: (saved.blockStats[ruleId] || 0) + 1 };
    const today = IntentioCore.todayKey();
    const count = saved.dailyStats.date === today ? saved.dailyStats.count + 1 : 1;
    await api.storage.local.set({ blockStats, dailyStats: { date: today, count } });
  }).catch(error => console.error("Intentio: failed to save statistics", error));
  return statsQueue;
}

api.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    await migrate();
    const state = await settings();
    switch (message.action) {
      case "getState": return state;
      case "addRule": {
        if (state.rules.length >= 500) throw new Error("The 500-rule limit has been reached.");
        const rule = IntentioCore.createRule(message.value, message.mode);
        if (state.rules.some(item => item.mode === rule.mode && item.value.toLowerCase() === rule.value.toLowerCase())) throw new Error("This rule already exists.");
        const support = await api.declarativeNetRequest.isRegexSupported({ regex: IntentioCore.toDnrRegex(rule), isCaseSensitive: false });
        if (!support.isSupported) throw new Error("This rule is too complex for the browser.");
        await api.storage.local.set({ rules: [...state.rules, rule] });
        await queueRefresh();
        return { ok: true, rule };
      }
      case "removeRule": {
        const rules = state.rules.filter(rule => rule.id !== message.id);
        const blockStats = { ...state.blockStats };
        delete blockStats[message.id];
        await api.storage.local.set({ rules, blockStats });
        await queueRefresh();
        return { ok: true };
      }
      case "importRules": {
        const incoming = message.rules;
        if (!Array.isArray(incoming)) throw new Error("Invalid format.");
        const rules = [...state.rules];
        for (const item of incoming) {
          let rule;
          if (typeof item === "string") rule = IntentioCore.migrateLegacy([item], false)[0];
          else if (item && typeof item.value === "string" && Object.hasOwn(IntentioCore.MODES, item.mode)) {
            rule = item.mode.startsWith("legacy") ? { id: crypto.randomUUID(), value: item.value, mode: item.mode } : IntentioCore.createRule(item.value, item.mode);
          } else throw new Error("One of the rules is invalid.");
          if (!rule) continue;
          if (rules.some(x => x.value.toLowerCase() === rule.value.toLowerCase() && x.mode === rule.mode)) continue;
          if (rules.length >= 500) throw new Error("The 500-rule limit has been reached.");
          if (!rule.mode.startsWith("legacy")) {
            const support = await api.declarativeNetRequest.isRegexSupported({ regex: IntentioCore.toDnrRegex(rule), isCaseSensitive: false });
            if (!support.isSupported) throw new Error("One of the rules is too complex for the browser.");
          }
          rule.id = crypto.randomUUID();
          rules.push(rule);
        }
        await api.storage.local.set({ rules });
        await queueRefresh();
        return { ok: true, added: rules.length - state.rules.length };
      }
      case "setEnabled": await api.storage.local.set({ isEnabled: Boolean(message.value) }); await queueRefresh(); return { ok: true };
      case "pauseRule": {
        if (!state.rules.some(rule => rule.id === message.id)) throw new Error("Rule not found.");
        const minutes = Math.min(60, Math.max(1, Number(message.minutes) || 10));
        await api.storage.local.set({ pausedRules: { ...state.pausedRules, [message.id]: Date.now() + minutes * 60000 } });
        await queueRefresh(); return { ok: true };
      }
      case "resumeRule": {
        const pausedRules = { ...state.pausedRules };
        delete pausedRules[message.id];
        await api.storage.local.set({ pausedRules }); await queueRefresh(); return { ok: true };
      }
      case "recordBlock": {
        const rule = IntentioCore.findMatch(state.rules, message.url, state.pausedRules);
        if (rule && rule.id === message.id && state.isEnabled) await recordBlock(rule.id);
        return { ok: true };
      }
      default: throw new Error("Unknown action.");
    }
  })().then(result => respond(result), error => respond({ error: error.message }));
  return true;
});
queueRefresh();
