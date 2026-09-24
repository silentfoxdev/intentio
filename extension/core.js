/* Shared, dependency-free rule model. Loaded by every extension page and the background. */
const IntentioCore = (() => {
  const MODES = Object.freeze({ starts: "Starts with", ends: "Ends with", contains: "Contains", exact: "Exact match", legacyExact: "Imported exact match", legacy: "Imported wildcard", legacyRegex: "Imported regex" });
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function normalizeInput(input) {
    const raw = String(input || "").trim();
    if (!raw || /\s|\*/.test(raw)) throw new Error("Enter an address without spaces or asterisks.");
    let url;
    try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
    catch { throw new Error("Enter a valid domain or URL."); }
    if (!/^https?:$/.test(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error("Only HTTP and HTTPS addresses are supported.");
    }
    return url.host.toLowerCase().replace(/^www\./, "") +
      (url.pathname === "/" ? "" : url.pathname) + url.search;
  }

  function normalizeFragment(input) {
    const raw = String(input || "").trim();
    if (!raw || /\s|\*/.test(raw)) throw new Error("Enter text without spaces or asterisks.");
    if (/^https?:\/\//i.test(raw)) return normalizeInput(raw);
    return raw.replace(/^www\./i, "");
  }

  function canonicalUrl(raw) {
    try {
      const url = new URL(raw);
      if (!/^https?:$/.test(url.protocol)) return null;
      return url.host.toLowerCase().replace(/^www\./, "") +
        (url.pathname === "/" ? "" : url.pathname) + url.search;
    } catch { return null; }
  }

  function isHostOnly(value) { return !/[/?]/.test(value); }

  function matches(rule, url) {
    const target = canonicalUrl(url);
    if (target === null || !rule || typeof rule.value !== "string") return false;
    const value = rule.value.toLowerCase();
    const text = target.toLowerCase();
    try {
      switch (rule.mode) {
        case "starts": return isHostOnly(value) ? (text === value || text.startsWith(value + "/") || text.startsWith(value + "?")) : text.startsWith(value);
        case "ends": return text.endsWith(value);
        case "contains": return text.includes(value);
        case "exact": return text === value;
        case "legacyExact": return text.split("?")[0] === value.toLowerCase();
        case "legacy": return new RegExp("^" + escapeRegex(value).replace(/\\\*/g, ".*") + "$", "i").test(text);
        case "legacyRegex": return new RegExp(rule.value, "i").test(target);
        default: return false;
      }
    } catch { return false; }
  }

  function findMatch(rules, url, paused = {}, now = Date.now()) {
    return rules.find(rule => (!paused[rule.id] || paused[rule.id] <= now) && matches(rule, url)) || null;
  }

  function todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function createRule(input, mode, id = crypto.randomUUID()) {
    if (!Object.hasOwn(MODES, mode) || mode.startsWith("legacy")) throw new Error("Invalid match type.");
    return { id, value: mode === "contains" || mode === "ends" ? normalizeFragment(input) : normalizeInput(input), mode };
  }

  function migrateLegacy(patterns, regexMode) {
    return (Array.isArray(patterns) ? patterns : []).filter(x => typeof x === "string" && x.trim()).map((pattern, index) => {
      const value = pattern.trim();
      if (regexMode) return { id: `legacy-${index}`, value, mode: "legacyRegex" };
      const stars = (value.match(/\*/g) || []).length;
      if (stars === 0) return { id: `legacy-${index}`, value: value.replace(/^www\./i, "").replace(/\/$/, ""), mode: "legacyExact" };
      if (stars === 1 && value.endsWith("*")) return { id: `legacy-${index}`, value: value.slice(0, -1).replace(/^www\./i, ""), mode: "starts" };
      if (stars === 1 && value.startsWith("*")) return { id: `legacy-${index}`, value: value.slice(1), mode: "ends" };
      if (stars === 2 && value.startsWith("*") && value.endsWith("*")) return { id: `legacy-${index}`, value: value.slice(1, -1), mode: "contains" };
      return { id: `legacy-${index}`, value, mode: "legacy" };
    });
  }

  function toDnrRegex(rule) {
    if (rule.mode === "legacyRegex") return null;
    const value = escapeRegex(rule.value).replace(/\\\?/, match => rule.value.includes("/") ? match : "/?" + match);
    const prefix = "^https?://(?:www\\.)?";
    switch (rule.mode) {
      case "exact": return prefix + value + (isHostOnly(rule.value) ? "/?" : "") + "$";
      case "legacyExact": return prefix + value + (isHostOnly(rule.value) ? "/?" : "") + "(?:\\?.*)?$";
      case "starts": return prefix + value + (isHostOnly(rule.value) ? "(?:[/?].*)?" : ".*") + "$";
      case "ends": return isHostOnly(rule.value)
        ? prefix + "(?:[^/?]*" + value + "/?|.*" + value + ")$"
        : prefix + ".*" + value + "$";
      case "contains": return prefix + ".*" + value + ".*$";
      case "legacy": return prefix + escapeRegex(rule.value).replace(/\\\*/g, ".*") + "$";
      default: return null;
    }
  }

  return { MODES, normalizeInput, canonicalUrl, matches, findMatch, todayKey, createRule, migrateLegacy, toDnrRegex };
})();
if (typeof module !== "undefined") module.exports = IntentioCore;
