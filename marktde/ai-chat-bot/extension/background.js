/*
 * Created background service worker for Markt.de AI Chat Bot (Preview)
 * - Routes messages between popup and content script
 * - Loads/saves config in chrome.storage.local
 * - Enforces preview-only (sending disabled) gate
 * - Basic activity logging
 * - Provides AI generation endpoint (custom or ollama)
 */

const EXTENSION_STATE_KEYS = Object.freeze({
  CONFIG: 'kobe.marktde.chatbot.config',
  STATE: 'kobe.marktde.chatbot.state',
  LOG: 'kobe.marktde.chatbot.log',
  API_LOG: 'kobe.marktde.chatbot.apiLog'
});

const DEFAULT_CONFIG = Object.freeze({
  language: 'de',
  sendingEnabled: false, // preview-only initially
  ai: {
    provider: 'custom', // 'custom' | 'ollama'
    endpoint: '',       // used when provider === 'custom'
    apiKey: '',
    model: 'gemini-pro',
    timeoutMs: 12000,
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'gpt-oss:20b',
      options: { temperature: 0.7 }
    }
  },
  behavior: {
    minDelayMs: 4500,
    maxDelayMs: 18000,
    avoidInstantReplyMs: 25000,
    jitterMs: 2000
  },
  adverts: [
    // { title: '...', text: '...', persona: '...' }
  ]
});

const DEFAULT_STATE = Object.freeze({
  running: false,
  lastActionAt: null,
  ownUserId: null
});

const SYSTEM_PROMPT_DE = `Du bist eine weibliche Chat-Assistentin (flirtend, sympathisch, glaubwürdig) für markt.de.
- Antworte IMMER auf Deutsch (natürlich, locker, keine übertriebenen Emojis, kein Bot-Ton).
- Schreibe kurzweilig (max. ~200 Zeichen), stelle gelegentlich eine Gegenfrage.
- Variiere Syntax und Wörter, vermeide Wiederholungen.
- Wenn Basis-Chat: Nutze die Anzeige (Titel + Kurztext) als Kontext, bleibe thematisch passend.
- Kein plumper Verkaufston; subtil Richtung Kennenlernen und späteren CTA hinführen.
- Wenn die letzte Nachricht vom Gegenüber kommt, reagiere menschlich (nicht zu sofort, aber dies ist nur eine Vorschau).`;

function log(message, level = 'info') {
  const entry = { ts: Date.now(), level, message };
  chrome.storage.local.get([EXTENSION_STATE_KEYS.LOG], (res) => {
    const arr = Array.isArray(res[EXTENSION_STATE_KEYS.LOG]) ? res[EXTENSION_STATE_KEYS.LOG] : [];
    arr.push(entry);
    const trimmed = arr.slice(-300);
    chrome.storage.local.set({ [EXTENSION_STATE_KEYS.LOG]: trimmed });
  });
}

function addApiLog(entry) {
  chrome.storage.local.get([EXTENSION_STATE_KEYS.API_LOG], (res) => {
    const arr = Array.isArray(res[EXTENSION_STATE_KEYS.API_LOG]) ? res[EXTENSION_STATE_KEYS.API_LOG] : [];
    arr.push({ ts: Date.now(), ...entry });
    const trimmed = arr.slice(-50);
    chrome.storage.local.set({ [EXTENSION_STATE_KEYS.API_LOG]: trimmed });
  });
}

async function getConfig() {
  const res = await chrome.storage.local.get([EXTENSION_STATE_KEYS.CONFIG]);
  return { ...DEFAULT_CONFIG, ...(res[EXTENSION_STATE_KEYS.CONFIG] || {}) };
}

async function saveConfig(cfg) {
  await chrome.storage.local.set({ [EXTENSION_STATE_KEYS.CONFIG]: cfg });
}

async function getState() {
  const res = await chrome.storage.local.get([EXTENSION_STATE_KEYS.STATE]);
  return { ...DEFAULT_STATE, ...(res[EXTENSION_STATE_KEYS.STATE] || {}) };
}

async function saveState(st) {
  await chrome.storage.local.set({ [EXTENSION_STATE_KEYS.STATE]: st });
}

chrome.runtime.onInstalled.addListener(async () => {
  const cfg = await getConfig();
  await saveConfig(cfg);
  const st = await getState();
  await saveState(st);
  log('Background installed and initialized');
});

async function aiGenerateFromCustom(aiCfg, messages) {
  const endpoint = aiCfg?.endpoint;
  if (!endpoint) return '';
  const body = { model: aiCfg?.model || 'gemini-pro', system: SYSTEM_PROMPT_DE, chat: { messages } };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), aiCfg?.timeoutMs || 12000);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(aiCfg?.apiKey ? { 'Authorization': `Bearer ${aiCfg.apiKey}` } : {})
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(id);
    if (!resp.ok) return '';
    const data = await resp.json();
    return String(data?.reply || '');
  } catch (e) {
    clearTimeout(id);
    return '';
  }
}

async function aiGenerateFromOllama(ollamaCfg, messages) {
  const base = (ollamaCfg?.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  const body = {
    model: ollamaCfg?.model || 'gpt-oss:20b',
    messages: [{ role: 'system', content: SYSTEM_PROMPT_DE }, ...messages],
    options: ollamaCfg?.options || { temperature: 0.7 }
  };
  try {
    const resp = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) return '';
    const data = await resp.json();
    return String(data?.message?.content || '');
  } catch (e) {
    return '';
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'cfg:get': {
          const cfg = await getConfig();
          sendResponse({ ok: true, cfg });
          break;
        }
        case 'cfg:set': {
          const cfg = await getConfig();
          const next = { ...cfg, ...(msg.patch || {}) };
          await saveConfig(next);
          sendResponse({ ok: true });
          break;
        }
        case 'state:get': {
          const st = await getState();
          sendResponse({ ok: true, st });
          break;
        }
        case 'state:set': {
          const st = await getState();
          const next = { ...st, ...(msg.patch || {}) };
          await saveState(next);
          sendResponse({ ok: true });
          break;
        }
        case 'bot:start': {
          const st = await getState();
          st.running = true;
          st.lastActionAt = Date.now();
          await saveState(st);
          log('Bot marked as running (preview-only)');
          sendResponse({ ok: true });
          break;
        }
        case 'bot:stop': {
          const st = await getState();
          st.running = false;
          await saveState(st);
          log('Bot stopped');
          sendResponse({ ok: true });
          break;
        }
        case 'bot:canSend': {
          const cfg = await getConfig();
          sendResponse({ ok: true, canSend: !!cfg.sendingEnabled });
          break;
        }
        case 'ai:generate': {
          const cfg = await getConfig();
          const provider = (cfg?.ai?.provider || 'custom').toLowerCase();
          const messages = Array.isArray(msg.messages) ? msg.messages : [];
          let text = '';
          if (provider === 'ollama') {
            text = await aiGenerateFromOllama(cfg.ai.ollama, messages);
          } else {
            text = await aiGenerateFromCustom(cfg.ai, messages);
          }
          if (!text) {
            // Fallback minimal suggestion
            const lastUser = [...messages].reverse().find(m => m.role === 'user');
            text = lastUser?.content ? `Klingt gut. Erzähl mir mehr – was genau meinst du?` : `Hey, schön von dir zu lesen. Womit fangen wir an?`;
          }
          sendResponse({ ok: true, preview: text });
          break;
        }
        case 'log:get': {
          const res = await chrome.storage.local.get([EXTENSION_STATE_KEYS.LOG]);
          sendResponse({ ok: true, log: res[EXTENSION_STATE_KEYS.LOG] || [] });
          break;
        }
        case 'log:clear': {
          await chrome.storage.local.set({ [EXTENSION_STATE_KEYS.LOG]: [] });
          sendResponse({ ok: true });
          break;
        }
        case 'apilog:add': {
          addApiLog({ name: msg.name || 'unknown', meta: msg.meta || {}, ms: msg.ms || 0 });
          sendResponse({ ok: true });
          break;
        }
        case 'apilog:get': {
          const res = await chrome.storage.local.get([EXTENSION_STATE_KEYS.API_LOG]);
          sendResponse({ ok: true, list: res[EXTENSION_STATE_KEYS.API_LOG] || [] });
          break;
        }
        default:
          break;
      }
    } catch (err) {
      log(`BG error: ${err?.message || err}`,'error');
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true; // async
}); 