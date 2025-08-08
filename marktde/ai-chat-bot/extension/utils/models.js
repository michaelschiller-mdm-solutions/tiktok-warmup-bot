/*
 * Added models for Markt.de AI Chat Bot (Preview)
 * - Thread, Message, helpers
 * - Attached to window.MarktModels
 */

(function() {
  function extractUserIdFromUrl(profileUrl) {
    if (!profileUrl) return null;
    const m = String(profileUrl).match(/userId,(\d+)/);
    return m ? m[1] : null;
  }

  function isNewChat(unreadCount, totalCount) {
    const u = Number(unreadCount || 0);
    const t = Number(totalCount || 0);
    return u === t && t === 1;
  }

  class Thread {
    constructor(threadData, chatType) {
      this.threadId = threadData.threadId;
      this.chatType = chatType; // 'basis' | 'premium'
      this.otherParticipantName = threadData.otherParticipantName;
      this.otherParticipantProfileUrl = threadData.otherParticipantProfileUrl;
      this.otherParticipantId = extractUserIdFromUrl(threadData.otherParticipantProfileUrl);
      this.otherParticipantInactive = !!threadData.otherParticipantInactive;
      this.lastMessageHtml = threadData.lastMessageHtml;
      this.lastMessageId = threadData.lastMessageId;
      this.lastMessageByMe = !!threadData.lastMessageByMe;
      this.lastMessageDate = threadData.lastMessageDate;
      this.lastMessageHasSharedImages = !!threadData.lastMessageHasSharedImages;
      this.numberOfTotalMessages = Number(threadData.numberOfTotalMessages || 0);
      this.numberOfUnreadMessages = Number(threadData.numberOfUnreadMessages || 0);
      this.titleText = threadData.titleText || null; // Basis advert title
      this.isNewChat = isNewChat(this.numberOfUnreadMessages, this.numberOfTotalMessages);
      this.needsResponse = this.numberOfUnreadMessages > 0 && !this.lastMessageByMe;
    }
  }

  class Message {
    constructor(msg) {
      this.messageId = msg.messageId;
      this.sentFromMe = !!msg.sentFromMe;
      this.seenByOther = !!msg.seenByOther;
      this.messageDate = msg.messageDate;
      this.messageText = msg?.messageText?.plain || '';
      this.sharedImages = Array.isArray(msg.sharedImages) ? msg.sharedImages : [];
      this.hasImages = this.sharedImages.length > 0;
    }
  }

  function classifyThreadsByGroup(apiResponse) {
    const result = { basis: [], premium: [], unreadCounts: { normal: 0, premium: 0 }, mailboxOwnerId: null };
    try {
      result.unreadCounts.normal = apiResponse?.piggyBackData?.unreadMailboxMessagesNormal || 0;
      result.unreadCounts.premium = apiResponse?.piggyBackData?.unreadMailboxMessagesPremium || 0;
      result.mailboxOwnerId = apiResponse?.data?.mailboxOwnerId || apiResponse?.data?.data?.mailboxOwnerId || null;

      const normal = apiResponse?.data?.normalGroup?.results || apiResponse?.data?.data?.normalGroup?.results || [];
      const prem = apiResponse?.data?.premiumGroup?.results || apiResponse?.data?.data?.premiumGroup?.results || [];

      result.basis = normal.map(t => new Thread(t, 'basis'));
      result.premium = prem.map(t => new Thread(t, 'premium'));
    } catch (_) {}
    return result;
  }

  window.MarktModels = {
    Thread,
    Message,
    extractUserIdFromUrl,
    isNewChat,
    classifyThreadsByGroup
  };
})(); 