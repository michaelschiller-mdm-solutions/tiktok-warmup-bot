/*
 * Added storage utils for Markt.de AI Chat Bot (Preview)
 * - Helpers to load/save config & state consistently
 * - Attached to window.MarktExtStorage for content-script access
 */

(function() {
  const KEYS = Object.freeze({
    CONFIG: 'kobe.marktde.chatbot.config',
    STATE: 'kobe.marktde.chatbot.state',
    LOG: 'kobe.marktde.chatbot.log'
  });

  async function getLocal(key) {
    const res = await chrome.storage.local.get([key]);
    return res[key];
  }

  async function setLocal(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  async function getConfig() {
    const resp = await chrome.runtime.sendMessage({ type: 'cfg:get' });
    if (!resp?.ok) throw new Error(resp?.error || 'cfg:get failed');
    return resp.cfg;
  }

  async function setConfig(patch) {
    const resp = await chrome.runtime.sendMessage({ type: 'cfg:set', patch });
    if (!resp?.ok) throw new Error(resp?.error || 'cfg:set failed');
  }

  async function getState() {
    const resp = await chrome.runtime.sendMessage({ type: 'state:get' });
    if (!resp?.ok) throw new Error(resp?.error || 'state:get failed');
    return resp.st;
  }

  async function setState(patch) {
    const resp = await chrome.runtime.sendMessage({ type: 'state:set', patch });
    if (!resp?.ok) throw new Error(resp?.error || 'state:set failed');
  }

  async function getLog() {
    const resp = await chrome.runtime.sendMessage({ type: 'log:get' });
    if (!resp?.ok) throw new Error(resp?.error || 'log:get failed');
    return resp.log;
  }

  async function clearLog() {
    const resp = await chrome.runtime.sendMessage({ type: 'log:clear' });
    if (!resp?.ok) throw new Error(resp?.error || 'log:clear failed');
  }

  window.MarktExtStorage = {
    KEYS,
    getLocal,
    setLocal,
    getConfig,
    setConfig,
    getState,
    setState,
    getLog,
    clearLog
  };
})(); 