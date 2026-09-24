"use strict";
const api = globalThis.browser || globalThis.chrome;
const $ = id => document.getElementById(id);
async function send(action, data = {}) {
  const result = await api.runtime.sendMessage({ action, ...data });
  if (!result || result.error) throw new Error(result?.error || "The background is not responding.");
  return result;
}
function showMessage(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
  element.hidden = !message;
}
async function hashPin(pin, salt) {
  const bytes = new TextEncoder().encode(pin);
  const key = await crypto.subtle.importKey("raw", bytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function createPinHash(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hexSalt = Array.from(salt, byte => byte.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${hexSalt}$${await hashPin(pin, salt)}`;
}
async function verifyPin(pin, stored) {
  if (!stored) return false;
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const bits = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("") === stored;
  }
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2" || !/^[a-f0-9]{32}$/i.test(parts[1])) return false;
  const salt = Uint8Array.from(parts[1].match(/../g), byte => parseInt(byte, 16));
  return await hashPin(pin, salt) === parts[2];
}
async function requirePin(label) {
  const { lockEnabled, lockPin } = await api.storage.local.get({ lockEnabled: false, lockPin: "" });
  if (!lockEnabled || !lockPin) return true;
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "pin-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const form = document.createElement("form");
    form.className = "pin-dialog";
    const title = document.createElement("h2");
    title.textContent = label;
    const input = document.createElement("input");
    input.type = "password";
    input.inputMode = "numeric";
    input.maxLength = 8;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "PIN");
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = "Incorrect PIN. Try again.";
    error.hidden = true;
    const actions = document.createElement("div");
    actions.className = "pin-actions";
    const cancel = document.createElement("button");
    cancel.type = "button"; cancel.className = "button subtle"; cancel.textContent = "Cancel";
    const confirm = document.createElement("button");
    confirm.type = "submit"; confirm.className = "button primary"; confirm.textContent = "Confirm";
    actions.append(cancel, confirm);
    form.append(title, input, error, actions);
    overlay.append(form);
    document.body.append(overlay);
    input.focus();
    const finish = result => { overlay.remove(); resolve(result); };
    cancel.addEventListener("click", () => finish(false));
    overlay.addEventListener("keydown", event => { if (event.key === "Escape") finish(false); });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      confirm.disabled = true;
      if (await verifyPin(input.value, lockPin)) finish(true);
      else { error.hidden = false; input.value = ""; input.focus(); confirm.disabled = false; }
    });
  });
}
