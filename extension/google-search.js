"use strict";
(() => {
  // Match Google's country-code domains without touching unrelated sites.
  const googleHost = /^(?:www\.)?google\.(?:com|cat|[a-z]{2}|(?:com|co)\.[a-z]{2})$/;
  if (!googleHost.test(location.hostname)) return;

  const api = globalThis.browser || globalThis.chrome;
  let hideGeminiResults = false;
  let changedSinceLoad = false;
  const overviewLabels = /^(?:AI Overview|Panoramica IA|KI-Übersicht|Aperçu IA|Vista general de IA|AI-overzicht|Przegląd AI|AI概要)$/i;
  const pageContainers = new Set(["search", "rso", "rcnt", "center_col", "cnt", "main"]);
  let observer;
  let scanTimer;

  function panelFor(element) {
    let node = element.parentElement;
    while (node && node !== document.documentElement) {
      if (pageContainers.has(node.id) || node.getAttribute("role") === "main") return null;
      if (node.getBoundingClientRect().height > 1500) return null;
      if (node.hasAttribute("data-hveid") || /^(?:ai_overview|AIOverview)$/.test(node.getAttribute("data-attrid") || "")) return node;
      if (node.parentElement?.id === "rso" && node.querySelectorAll("h3").length < 2) return node;
      node = node.parentElement;
    }
    return null;
  }

  function scanOverview() {
    const results = document.querySelector("#rcnt") || document.querySelector("#search");
    if (!results) return;
    const markers = results.querySelectorAll('#m-x-content, [data-attrid="ai_overview"], [data-attrid="AIOverview"], [data-async-type="folsrch"], a[href^="https://support.google.com/websearch?p=ai_overviews"]');
    for (const marker of markers) {
      const panel = panelFor(marker);
      if (panel) panel.setAttribute("data-intentio-gemini-panel", "true");
    }
    for (const heading of results.querySelectorAll('h1, h2, [role="heading"]')) {
      const label = (heading.getAttribute("aria-label") || heading.textContent || "").trim();
      if (label.length > 60 || !overviewLabels.test(label) || heading.closest("a")) continue;
      const panel = panelFor(heading);
      if (panel) panel.setAttribute("data-intentio-gemini-panel", "true");
    }
  }

  function startScanner() {
    if (observer) { scanOverview(); return; }
    observer = new MutationObserver(() => {
      if (scanTimer) return;
      scanTimer = setTimeout(() => { scanTimer = null; scanOverview(); }, 50);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scanOverview();
  }

  function updatePage() {
    const root = document.documentElement;
    if (!root) {
      document.addEventListener("DOMContentLoaded", updatePage, { once: true });
      return;
    }
    if (hideGeminiResults) root.setAttribute("data-intentio-hide-gemini", "true");
    else root.removeAttribute("data-intentio-hide-gemini");
    if (hideGeminiResults) startScanner();
    else {
      observer?.disconnect();
      observer = null;
      clearTimeout(scanTimer);
      scanTimer = null;
      for (const panel of document.querySelectorAll('[data-intentio-gemini-panel="true"]')) panel.removeAttribute("data-intentio-gemini-panel");
    }
  }

  api.storage.local.get({ hideGeminiResults: false })
    .then(saved => {
      if (!changedSinceLoad) hideGeminiResults = Boolean(saved.hideGeminiResults);
      updatePage();
    })
    .catch(error => console.error("Intentio: cannot read Google Search preferences", error));
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.hideGeminiResults) return;
    changedSinceLoad = true;
    hideGeminiResults = Boolean(changes.hideGeminiResults.newValue);
    updatePage();
  });
})();
