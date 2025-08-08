/*
 * Added humanizer utilities for Markt.de AI Chat Bot (Preview)
 * - Randomized delay windows, avoid instant replies
 * - Attached to window.MarktHumanizer
 */

(function() {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function withJitter(ms, jitterMs) {
    const j = randInt(-Math.abs(jitterMs), Math.abs(jitterMs));
    return clamp(ms + j, 0, Number.MAX_SAFE_INTEGER);
  }

  function computeReplyDelayMs(behavior, context = {}) {
    const baseMin = Number(behavior?.minDelayMs || 4000);
    const baseMax = Number(behavior?.maxDelayMs || 15000);
    const jitter = Number(behavior?.jitterMs || 1500);
    let delay = randInt(baseMin, baseMax);

    const avoidInstant = Number(behavior?.avoidInstantReplyMs || 20000);
    if (context?.otherJustReplied) {
      delay = Math.max(delay, avoidInstant + randInt(1000, 6000));
    }

    if (context?.chatType === 'basis') {
      delay += randInt(1000, 5000);
    }

    return withJitter(delay, jitter);
  }

  window.MarktHumanizer = {
    clamp,
    randInt,
    withJitter,
    computeReplyDelayMs
  };
})(); 