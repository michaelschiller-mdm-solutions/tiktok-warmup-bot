/*
 * Created popup logic for Markt.de AI Chat Bot (Preview)
 * - Load/Save config (German defaults)
 * - Manage adverts
 * - Start/Stop state
 * - Test/Preview section (no sending)
 */

const $ = (sel) => document.querySelector(sel);

async function loadConfig() {
  const resp = await chrome.runtime.sendMessage({ type: 'cfg:get' });
  if (!resp?.ok) throw new Error(resp?.error || 'cfg:get failed');
  return resp.cfg;
}
async function saveConfig(patch) {
  const resp = await chrome.runtime.sendMessage({ type: 'cfg:set', patch });
  if (!resp?.ok) throw new Error(resp?.error || 'cfg:set failed');
}
async function loadState() {
  const resp = await chrome.runtime.sendMessage({ type: 'state:get' });
  if (!resp?.ok) throw new Error(resp?.error || 'state:get failed');
  return resp.st;
}
async function saveState(patch) {
  const resp = await chrome.runtime.sendMessage({ type: 'state:set', patch });
  if (!resp?.ok) throw new Error(resp?.error || 'state:set failed');
}
async function getLog() {
  const resp = await chrome.runtime.sendMessage({ type: 'log:get' });
  if (!resp?.ok) throw new Error(resp?.error || 'log:get failed');
  return resp.log;
}
async function clearLog() {
  await chrome.runtime.sendMessage({ type: 'log:clear' });
}

async function getApiLog() {
  const resp = await chrome.runtime.sendMessage({ type: 'apilog:get' });
  if (!resp?.ok) throw new Error(resp?.error || 'apilog:get failed');
  return resp.list;
}

function renderLog(lines) {
  const box = $('#logBox');
  box.textContent = (lines || []).map(l => {
    const dt = new Date(l.ts).toLocaleTimeString();
    return `[${dt}] ${l.level.toUpperCase()} ${l.message}`;
  }).join('\n');
}

function renderAdverts(adverts) {
  const root = $('#advertsList');
  root.innerHTML = '';
  (adverts || []).forEach((a, idx) => {
    const div = document.createElement('div');
    div.className = 'advert-item';
    div.innerHTML = `<div><div class="advert-item-title">${a.title}</div><div class="small">${a.persona || ''}</div></div>`;
    const btn = document.createElement('button');
    btn.textContent = 'Entfernen';
    btn.addEventListener('click', async () => {
      const cfg = await loadConfig();
      const next = (cfg.adverts || []).filter((_, i) => i !== idx);
      await saveConfig({ adverts: next });
      renderAdverts(next);
    });
    div.appendChild(btn);
    root.appendChild(div);
  });
}

function renderApiLog(items) {
  const box = $('#apiLogBox');
  box.textContent = (items || []).map(x => {
    const dt = new Date(x.ts).toLocaleTimeString();
    return `[${dt}] ${x.name} (${x.ms}ms) ${JSON.stringify(x.meta || {})}`;
  }).join('\n');
}

function badge(label, cls) { return `<span class="badge ${cls}">${label}</span>`; }

function buildBadges(thread) {
  const arr = [];
  if (thread.isNewChat) arr.push(badge('new', 'green'));
  if (thread.needsResponse) arr.push(badge('needs-response', 'blue'));
  if (thread.lastMessageByMe) arr.push(badge('last-by-me', 'gray'));
  if (thread.chatType === 'basis' && thread.titleText) arr.push(badge('basis-match', 'purple'));
  return `<div class="badges">${arr.join('')}</div>`;
}

function splitMessages(messages) {
  const me = [], user = [];
  for (const m of messages) {
    if (m.sentFromMe) me.push(m); else user.push(m);
  }
  return { me, user };
}

async function requestAiPreview(messages, threadMeta) {
  const seq = [{ role: 'system', content: '' }]; // will be overridden in background with full system
  // Compose from recent messages (limit to last 15 entries)
  const last = messages.slice(-15).map(m => ({ role: m.sentFromMe ? 'assistant' : 'user', content: m.messageText || '' }));
  const payloadMessages = last; // background adds system
  const t0 = performance.now();
  const resp = await chrome.runtime.sendMessage({ type: 'ai:generate', messages: payloadMessages, threadMeta });
  const dt = Math.round(performance.now() - t0);
  await chrome.runtime.sendMessage({ type: 'apilog:add', name: 'ai:generate', ms: dt, meta: { threadId: threadMeta.threadId } });
  if (!resp?.ok) throw new Error(resp?.error || 'ai:generate failed');
  return resp.preview || '';
}

async function fetchTopThreadsAndRender() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // get threads via content script
  const t0 = performance.now();
  const resp = await chrome.tabs.sendMessage(tab.id, { type: 'cs:getThreads' });
  const dt = Math.round(performance.now() - t0);
  await chrome.runtime.sendMessage({ type: 'apilog:add', name: 'getThreads', ms: dt });
  if (!resp?.ok) throw new Error(resp?.error || 'cs:getThreads failed');

  const { basis, premium } = resp.threads;
  const all = [...basis, ...premium]
    .sort((a, b) => Number(b.lastMessageDate?.epochTime || 0) - Number(a.lastMessageDate?.epochTime || 0))
    .slice(0, 5);

  const container = $('#threadsContainer');
  container.innerHTML = '';

  for (const thread of all) {
    // fetch messages
    const t1 = performance.now();
    const r2 = await chrome.tabs.sendMessage(tab.id, { type: 'cs:getMessages', threadId: thread.threadId });
    const dt2 = Math.round(performance.now() - t1);
    await chrome.runtime.sendMessage({ type: 'apilog:add', name: 'getMessages', ms: dt2, meta: { threadId: thread.threadId } });
    if (!r2?.ok) continue;

    const messages = r2.messages || [];
    const { me, user } = splitMessages(messages);

    // real AI preview
    let aiText = '';
    try {
      aiText = await requestAiPreview(messages, { threadId: thread.threadId, chatType: thread.chatType, titleText: thread.titleText || null });
    } catch (e) {
      aiText = `AI error: ${String(e?.message || e)}`;
    }

    const aiBadge = aiText && /[?？]/.test(aiText) ? badge('ai-question', 'orange') : '';

    const card = document.createElement('div');
    card.className = 'thread-card';
    card.innerHTML = `
      <div class="thread-header">
        <div>
          <div><strong>${thread.otherParticipantName || ''}</strong> — ${thread.chatType.toUpperCase()} — threadId ${thread.threadId}</div>
          <div class="thread-meta">unread ${thread.numberOfUnreadMessages} / total ${thread.numberOfTotalMessages} — lastByMe ${thread.lastMessageByMe} — last ${new Date(Number(thread.lastMessageDate?.epochTime || 0)).toLocaleString()}</div>
          ${thread.chatType === 'basis' && thread.titleText ? `<div class="thread-meta">advert: ${thread.titleText}</div>` : ''}
          ${buildBadges(thread)} ${aiBadge}
        </div>
      </div>
      <div class="thread-body">
        <div class="msg-col">
          <div class="small">User Messages</div>
          ${user.map(m => `<div class="msg">${escapeHtml(m.messageText || '')}</div>`).join('')}
        </div>
        <div class="msg-col">
          <div class="small">Sent by Me</div>
          ${me.map(m => `<div class="msg me">${escapeHtml(m.messageText || '')}</div>`).join('')}
        </div>
      </div>
      <div class="ai-preview"><strong>AI Vorschau:</strong> ${escapeHtml(aiText || '')}</div>
      <details>
        <summary>Raw data</summary>
        <div class="raw">${escapeHtml(JSON.stringify({ thread, messages }, null, 2))}</div>
      </details>
    `;
    container.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

let autoTimer = null;
function startAutoRefresh() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(async () => {
    try { await fetchTopThreadsAndRender(); renderApiLog(await getApiLog()); } catch (_) {}
  }, 12000);
}
function stopAutoRefresh() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
}

async function populateUi() {
  const cfg = await loadConfig();
  $('#language').value = cfg.language || 'de';
  $('#aiProvider').value = (cfg.ai?.provider || 'custom');
  $('#aiEndpoint').value = cfg.ai?.endpoint || '';
  $('#aiKey').value = cfg.ai?.apiKey || '';
  $('#aiModel').value = cfg.ai?.model || 'gemini-pro';
  $('#ollamaBase').value = cfg.ai?.ollama?.baseUrl || 'http://localhost:11434';
  $('#ollamaModel').value = cfg.ai?.ollama?.model || 'gpt-oss:20b';
  $('#minDelay').value = cfg.behavior?.minDelayMs ?? 4500;
  $('#maxDelay').value = cfg.behavior?.maxDelayMs ?? 18000;
  $('#avoidInstant').value = cfg.behavior?.avoidInstantReplyMs ?? 25000;
  $('#jitter').value = cfg.behavior?.jitterMs ?? 2000;
  renderAdverts(cfg.adverts || []);

  const st = await loadState();
  $('#ownUserId').textContent = st.ownUserId || '-';
}

async function wireEvents() {
  $('#btnSaveCfg').addEventListener('click', async () => {
    const patch = {
      language: $('#language').value,
      ai: {
        provider: $('#aiProvider').value,
        endpoint: $('#aiEndpoint').value.trim(),
        apiKey: $('#aiKey').value.trim(),
        model: $('#aiModel').value.trim(),
        timeoutMs: 12000,
        ollama: {
          baseUrl: $('#ollamaBase').value.trim() || 'http://localhost:11434',
          model: $('#ollamaModel').value.trim() || 'gpt-oss:20b',
          options: { temperature: 0.7 }
        }
      },
      behavior: {
        minDelayMs: Number($('#minDelay').value || 4500),
        maxDelayMs: Number($('#maxDelay').value || 18000),
        avoidInstantReplyMs: Number($('#avoidInstant').value || 25000),
        jitterMs: Number($('#jitter').value || 2000)
      }
    };
    await saveConfig(patch);
    await populateUi();
  });

  $('#btnAddAdvert').addEventListener('click', async () => {
    const title = $('#advTitle').value.trim();
    const text = $('#advText').value.trim();
    const persona = $('#advPersona').value.trim();
    if (!title) return;
    const cfg = await loadConfig();
    const next = [...(cfg.adverts || []), { title, text, persona }];
    await saveConfig({ adverts: next });
    $('#advTitle').value = '';
    $('#advText').value = '';
    $('#advPersona').value = '';
    renderAdverts(next);
  });

  $('#btnStart').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'bot:start' });
    renderLog(await getLog());
  });
  $('#btnStop').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'bot:stop' });
    renderLog(await getLog());
  });

  $('#btnRefreshLog').addEventListener('click', async () => {
    renderLog(await getLog());
  });
  $('#btnClearLog').addEventListener('click', async () => {
    await clearLog();
    renderLog([]);
  });

  $('#btnPreview').addEventListener('click', async () => {
    const threadId = $('#testThreadId').value.trim();
    let userId = $('#testUserId').value.trim();
    const chatType = $('#testChatType').value;
    const advTitle = $('#testAdvertTitle').value.trim();

    const st = await loadState();
    if (!userId) userId = st.ownUserId || '';
    if (!threadId || !userId) {
      $('#previewBox').textContent = 'Bitte Thread ID und User ID angeben (User ID wird normalerweise automatisch erkannt).';
      return;
    }

    // Fetch messages and request preview via content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      $('#previewBox').textContent = 'Aktiver Tab nicht gefunden.';
      return;
    }

    const threadMeta = {
      threadId,
      chatType,
      titleText: chatType === 'basis' ? advTitle || null : null
    };
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'cs:previewReply', threadId, threadMeta });
    if (!resp?.ok) {
      $('#previewBox').textContent = `Fehler: ${resp?.error || 'Unbekannt'}`;
      return;
    }
    $('#previewBox').textContent = resp.preview || '';
  });
}

// wire new inspector UI
async function wireInspector() {
  $('#btnRefresh').addEventListener('click', async () => {
    await fetchTopThreadsAndRender();
    renderApiLog(await getApiLog());
  });
  $('#btnRefreshApiLog').addEventListener('click', async () => {
    renderApiLog(await getApiLog());
  });
  $('#autoRefresh').addEventListener('change', async (e) => {
    if (e.target.checked) startAutoRefresh(); else stopAutoRefresh();
  });
}

// integrate into init
(async function init() {
  try {
    await populateUi();
    await wireEvents();
    await wireInspector();
    renderLog(await getLog());
    renderApiLog(await getApiLog());
    // auto-load threads on open
    await fetchTopThreadsAndRender();
  } catch (err) {
    console.error('Popup init error', err);
  }
})(); 