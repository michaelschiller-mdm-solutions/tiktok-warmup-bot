/*
 * Added MarktDeApiClient for Markt.de AI Chat Bot (Preview)
 * - getThreads, getMessages, submitTextMessage (gated), checkForUpdates
 * - Attached to window.MarktApi
 */

(function() {
  async function getConfig() {
    const resp = await chrome.runtime.sendMessage({ type: 'cfg:get' });
    if (!resp?.ok) throw new Error(resp?.error || 'cfg:get failed');
    return resp.cfg;
  }

  const HEADERS_JSON = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  class MarktDeApiClient {
    constructor() {
      this.base = '/benutzer/postfach.htm';
    }

    async getThreads(ownUserId, page = 0, messageState = 'ALL') {
      const url = new URL(this.base, window.location.origin);
      url.searchParams.set('ajaxCall', 'getThreads');
      url.searchParams.set('userId', String(ownUserId));
      url.searchParams.set('page', String(page));
      url.searchParams.set('messageState', messageState);

      const resp = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: HEADERS_JSON
      });
      if (!resp.ok) throw new Error(`getThreads HTTP ${resp.status}`);
      return await resp.json();
    }

    async getMessages(threadId, ownUserId) {
      const url = new URL(this.base, window.location.origin);
      url.searchParams.set('ajaxCall', 'getMessages');
      url.searchParams.set('threadId', String(threadId));
      url.searchParams.set('userId', String(ownUserId));

      const resp = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: HEADERS_JSON
      });
      if (!resp.ok) throw new Error(`getMessages HTTP ${resp.status}`);
      return await resp.json();
    }

    async submitTextMessage(threadId, ownUserId, message) {
      const cfg = await getConfig();
      if (!cfg.sendingEnabled) {
        return { ok: false, error: 'SENDING_DISABLED' };
      }
      const body = new URLSearchParams();
      body.set('ajaxCall', 'submitMessage');
      body.set('threadId', String(threadId));
      body.set('userId', String(ownUserId));
      if (message) body.set('message', message);

      const resp = await fetch(this.base, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...HEADERS_JSON,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      if (!resp.ok) throw new Error(`submitMessage HTTP ${resp.status}`);
      return { ok: true, data: await resp.json() };
    }

    async checkForUpdates(ownUserId, threadId, lastMessageDate, lastSeenMessageDate, lastUpdate) {
      const url = new URL(this.base, window.location.origin);
      url.searchParams.set('ajaxCall', 'checkForUpdates');
      url.searchParams.set('userId', String(ownUserId));
      url.searchParams.set('threadId', String(threadId));
      url.searchParams.set('lastMessageDate', String(lastMessageDate || ''));
      url.searchParams.set('lastSeenMessageDate', String(lastSeenMessageDate || ''));
      url.searchParams.set('lastUpdate', String(lastUpdate || ''));

      const resp = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: HEADERS_JSON
      });
      if (!resp.ok) throw new Error(`checkForUpdates HTTP ${resp.status}`);
      return await resp.json();
    }
  }

  window.MarktApi = { MarktDeApiClient };
})(); 