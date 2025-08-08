/*
 * Created content script for Markt.de AI Chat Bot (Preview)
 * - Inject page-bridge to read window.clsyDataLayer
 * - Provide handlers to fetch threads/messages and build preview via AIService
 */
console.log('Markt.de AI Chat Bot: content script loaded');

const { setState, getState, getConfig } = window.MarktExtStorage || {};
const { MarktDeApiClient } = window.MarktApi || {};
const { classifyThreadsByGroup, Message } = window.MarktModels || {};
const { AIService } = window.MarktAI || {};

const api = new MarktDeApiClient();
const ai = new AIService();

// Inject page-bridge
(function injectBridge() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('page-bridge.js');
  s.onload = function() { this.remove(); };
  (document.head || document.documentElement).appendChild(s);
})();

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === 'MARKTDE_OWN_USER_ID') {
    try {
      const st = await getState();
      if (!st.ownUserId && event.data.ownUserId) {
        await setState({ ownUserId: event.data.ownUserId });
      }
    } catch (_) {}
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.type) return;

      if (msg.type === 'cs:getThreads') {
        const st = await getState();
        if (!st.ownUserId) throw new Error('ownUserId unavailable');
        const data = await api.getThreads(st.ownUserId, 0, 'ALL');
        const classified = classifyThreadsByGroup(data);
        sendResponse({ ok: true, threads: classified });
        return;
      }

      if (msg.type === 'cs:getMessages') {
        const st = await getState();
        if (!st.ownUserId) throw new Error('ownUserId unavailable');
        const data = await api.getMessages(msg.threadId, st.ownUserId);
        const msgs = (data?.data?.messages || []).map(m => new Message(m));
        sendResponse({ ok: true, messages: msgs });
        return;
      }

      if (msg.type === 'cs:previewReply') {
        const st = await getState();
        if (!st.ownUserId) throw new Error('ownUserId unavailable');
        const cfg = await getConfig();
        const messagesResp = await api.getMessages(msg.threadId, st.ownUserId);
        const messages = (messagesResp?.data?.messages || []).map(m => new Message(m));
        const threadMeta = msg.threadMeta || null; // pass from popup

        // Resolve advert match (by exact title) for Basis
        let advert = null;
        if (threadMeta?.chatType === 'basis' && threadMeta?.titleText) {
          const exact = (cfg.adverts || []).find(a => a.title === threadMeta.titleText);
          if (exact) advert = exact; else advert = null;
        }

        const result = await ai.generateSuggestion({ messages, thread: threadMeta, advert, persona: null });
        sendResponse({ ok: true, preview: result.preview });
        return;
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true; // async
}); 