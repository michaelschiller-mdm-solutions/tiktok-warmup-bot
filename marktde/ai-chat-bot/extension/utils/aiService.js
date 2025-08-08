/*
 * Added AIService for Markt.de AI Chat Bot (Preview)
 * - German default system prompt
 * - Providers: custom HTTP endpoint or Ollama (local)
 * - Returns preview-only suggestion
 * - Attached to window.MarktAI
 */

(function() {
  async function getConfig() {
    const resp = await chrome.runtime.sendMessage({ type: 'cfg:get' });
    if (!resp?.ok) throw new Error(resp?.error || 'cfg:get failed');
    return resp.cfg;
  }

  const SYSTEM_PROMPT_DE = `Du bist eine weibliche Chat-Assistentin (flirtend, sympathisch, glaubwürdig) für markt.de.
- Antworte IMMER auf Deutsch (natürlich, locker, keine übertriebenen Emojis, kein Bot-Ton).
- Schreibe kurzweilig (max. ~200 Zeichen), stelle gelegentlich eine Gegenfrage.
- Variiere Syntax und Wörter, vermeide Wiederholungen.
- Wenn Basis-Chat: Nutze die Anzeige (Titel + Kurztext) als Kontext, bleibe thematisch passend.
- Kein plumper Verkaufston; subtil Richtung Kennenlernen und späteren CTA hinführen.
- Wenn die letzte Nachricht vom Gegenüber kommt, reagiere menschlich (nicht zu sofort, aber dies ist nur eine Vorschau).`;

  class AIService {
    async generateSuggestion({ messages, thread, advert, persona }) {
      const cfg = await getConfig();
      const provider = (cfg?.ai?.provider || 'custom').toLowerCase();

      // Common prompt payload
      const payload = this.buildPromptPayload({ messages, thread, advert, persona });

      try {
        if (provider === 'ollama') {
          const text = await this.callOllama(cfg.ai.ollama, payload);
          return { ok: true, preview: text || this.buildFallbackSuggestion(payload) };
        }
        // default: custom HTTP provider
        const text = await this.callCustom(cfg.ai, payload);
        return { ok: true, preview: text || this.buildFallbackSuggestion(payload) };
      } catch (_) {
        return { ok: true, preview: this.buildFallbackSuggestion(payload) };
      }
    }

    buildPromptPayload({ messages, thread, advert, persona }) {
      return {
        system: SYSTEM_PROMPT_DE,
        language: 'de',
        chatType: thread?.chatType || 'premium',
        persona: persona || null,
        advert: advert ? { title: advert.title, text: advert.text } : null,
        messages: messages.map(m => ({
          role: m.sentFromMe ? 'assistant' : 'user',
          content: m.messageText || ''
        })),
        thread: {
          otherParticipantName: thread?.otherParticipantName || '',
          titleText: thread?.titleText || null
        }
      };
    }

    async callCustom(aiCfg, payload) {
      const endpoint = aiCfg?.endpoint;
      if (!endpoint) return '';
      const apiKey = aiCfg?.apiKey;
      const model = aiCfg?.model || 'gemini-pro';
      const timeoutMs = aiCfg?.timeoutMs || 12000;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
          },
          body: JSON.stringify({ model, system: payload.system, chat: payload }),
          signal: controller.signal
        });
        clearTimeout(id);
        if (!resp.ok) return '';
        const data = await resp.json();
        return String(data?.reply || '');
      } catch (_) {
        clearTimeout(id);
        return '';
      }
    }

    async callOllama(ollamaCfg, payload) {
      const base = (ollamaCfg?.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
      const model = ollamaCfg?.model || 'gpt-oss:20b';
      const options = ollamaCfg?.options || { temperature: 0.7 };

      // Build OpenAI-like chat messages for Ollama
      const msgs = [
        { role: 'system', content: payload.system },
        ...payload.messages.map(m => ({ role: m.role, content: m.content }))
      ];

      const body = {
        model,
        messages: msgs,
        options
      };

      const resp = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) return '';
      const data = await resp.json();
      // Expect { message: { content: string } } or stream chunks (non-stream here)
      const content = data?.message?.content || '';
      return String(content);
    }

    buildFallbackSuggestion(payload) {
      const lastUser = [...payload.messages].reverse().find(m => m.role === 'user');
      const name = payload?.thread?.otherParticipantName || '';
      const basisHint = payload.chatType === 'basis' && payload.advert?.title
        ? ` (bzgl. „${payload.advert.title}“) `
        : ' ';
      const base = lastUser?.content?.trim() || '';
      const neutral = base ? `Hey${name ? ' ' + name : ''}${basisHint}- ${this.shorten(base, 80)} Klingt spannend. Was genau stellst du dir vor?` :
        `Hey${name ? ' ' + name : ''}${basisHint}schön, von dir zu lesen. Womit fangen wir an?`;
      return this.shorten(neutral, 200);
    }

    shorten(text, maxLen) {
      if (!text) return '';
      if (text.length <= maxLen) return text;
      return text.slice(0, maxLen - 1) + '…';
    }
  }

  window.MarktAI = { AIService };
})();

/* Tooltip guidance (Prompt Best Practices):
- Sei klar und spezifisch (Ziel, Stil, max. Länge definieren)
- Kontext beifügen (letzte Nachrichten, Anzeigen-Titel/Text)
- Erwartetes Format beschreiben (kurz, flirty, eine Rückfrage)
- Beispiele variieren und testen (iteriere kontinuierlich)
Quellen: Prompt Engineering Best Practices 2025, Google AI Prompt Best Practices.
*/ 