# Design Document

## Overview

This document outlines the technical design for the markt.de AI Chat Bot system, a Chrome extension that automates conversation management on markt.de similar to CupidBot AI. The system will provide intelligent, AI-powered responses to build social connections and drive OnlyFans conversions through sophisticated conversation tracking and automated messaging.

The bot operates as a **single unified system** that handles both **Basis chats** (advert-related conversations) and **Premium chats** (general conversations) through API-driven automation without requiring separate modes or DOM manipulation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Background    │  │  Content Script │  │   Popup UI      │ │
│  │   Service       │  │   (Injected)    │  │   Interface     │ │
│  │   Worker        │  └─────────────────┘  └─────────────────┘ │
│  └─────────────────┘           │                    │          │
├─────────────────────────────────┼────────────────────┼──────────┤
│  ┌─────────────────┐           │                    │          │
│  │   Local Storage │           │                    │          │
│  │   - Profiles    │           │                    │          │
│  │   - Conversations│          │                    │          │
│  │   - Metrics     │           │                    │          │
│  │   - Images      │           │                    │          │
│  └─────────────────┘           │                    │          │
└─────────────────────────────────┼────────────────────┼──────────┘
                                  │                    │
┌─────────────────────────────────┼────────────────────┼──────────┐
│                markt.de         │                    │          │
├─────────────────────────────────┼────────────────────┼──────────┤
│  ┌─────────────────┐           │                    │          │
│  │   API Endpoints │◄──────────┘                    │          │
│  │   - getMessages │                                 │          │
│  │   - submitMessage│                                │          │
│  │   - getThreads  │                                 │          │
│  │   - checkUpdates│                                 │          │
│  └─────────────────┘                                 │          │
│  ┌─────────────────┐                                 │          │
│  │   DOM Elements  │◄────────────────────────────────┘          │
│  │   - Chat Lists  │                                            │
│  │   - Status Icons│                                            │
│  │   - Tooltips    │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼──────────────────────────────┐
│              External AI        │                              │
├─────────────────────────────────┼──────────────────────────────┤
│  ┌─────────────────┐           │                              │
│  │   Gemini API    │◄──────────┘                              │
│  │   (Primary)     │                                          │
│  └─────────────────┘                                          │
│  ┌─────────────────┐                                          │
│  │   OpenAI API    │                                          │
│  │   (Future)      │                                          │
│  └─────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

The system consists of several key components:

1. **Bot Engine**: Core automation logic and conversation management
2. **API Client**: Direct communication with markt.de endpoints
3. **AI Service**: Integration with Gemini API for message generation
4. **Profile Manager**: Configuration and profile management system
5. **Conversation Tracker**: Metrics and conversation state management
6. **UI Manager**: Extension popup and DOM manipulation
7. **Storage Manager**: Local data persistence and retrieval

## Components and Interfaces

### 1. Bot Engine (`BotEngine`)

**Purpose**: Central orchestrator for all bot operations

**Key Methods**:

```javascript
class BotEngine {
  constructor(profileId)
  async start()
  async stop()
  async processConversations()
  async handleNewMessage(threadId, message)
  async generateResponse(conversationContext)
  async sendTextMessage(threadId, message)
  async classifyConversations(threads)
  async matchAdvertToConversation(titleText, configuredAdverts)
}
```

**Responsibilities**:

- Coordinate between all system components
- Manage unified conversation processing (both basis and premium)
- Handle conversation classification and advert matching
- Implement rate limiting and error handling
- Process both `normalGroup` and `premiumGroup` threads from API responses

### 2. API Client (`MarktDeApiClient`)

**Purpose**: Direct communication with markt.de API endpoints

**Key Methods**:

```javascript
class MarktDeApiClient {
  // Core API methods (✅ Verified Working)
  async getThreads(ownUserId, page = 0, messageState = 'ALL')
  async getMessages(threadId, ownUserId)
  async submitTextMessage(threadId, ownUserId, message)
  async checkForUpdates(ownUserId, threadId, lastMessageDate, lastSeenMessageDate, lastUpdate)
  
  // Utility methods
  extractUserIdFromSession() // Extract from window.clsyDataLayer[0].loggedInUserId
  extractUserIdFromProfileUrl(profileUrl) // Extract from userId,{ID} pattern
  classifyThreadsByGroup(threadsResponse) // Separate normalGroup vs premiumGroup
  
  // Future implementation (Phase 2)
  // async uploadImage(imageFile) // For image upload functionality
  // async submitImageMessage(threadId, ownUserId, fileId)
  // async submitTextWithImageMessage(threadId, ownUserId, message, fileId)
}
```

**API Endpoints Mapping** (✅ Verified Working):

- **GET** `/benutzer/postfach.htm?ajaxCall=getThreads&userId={ownUserId}&page={page}&messageState=ALL`
  - Returns both `normalGroup` (basis chats) and `premiumGroup` (premium chats)
  - Contains `mailboxOwnerId`, thread data, participant info, and advert titles
- **GET** `/benutzer/postfach.htm?ajaxCall=getMessages&threadId={threadId}&userId={ownUserId}`
  - Returns complete conversation history with `meParticipant` and `otherParticipant` data
- **POST** `/benutzer/postfach.htm` with `ajaxCall=submitMessage&threadId={threadId}&userId={ownUserId}&message={urlEncodedMessage}` (text only)
- **GET** `/benutzer/postfach.htm?ajaxCall=checkForUpdates&userId={ownUserId}&threadId={threadId}&lastMessageDate={timestamp}&lastSeenMessageDate={timestamp}&lastUpdate={timestamp}`
  - Returns `piggyBackData` with unread counts: `unreadMailboxMessagesNormal` and `unreadMailboxMessagesPremium`

**Critical API Parameter Pattern** (✅ Verified):
- **`userId` parameter**: Always the logged-in user's own ID (e.g., `39826031`)
- **Other participant ID**: Extracted from `otherParticipantProfileUrl` in API responses
- **Chat type detection**: Based on which group the thread appears in (`normalGroup` vs `premiumGroup`)

**User ID Extraction Methods**:
- **Session Data**: `window.clsyDataLayer[0].loggedInUserId` (primary method)
- **Profile URLs**: Extract from `otherParticipantProfileUrl` like `https://www.markt.de/tim_yoo/userId,39630845/profile.htm`
- **API Responses**: Available in `meParticipant` and `otherParticipant` objects

### 3. AI Service (`GeminiAIService`)

**Purpose**: Generate contextually appropriate responses using AI

**Key Methods**:

```javascript
class GeminiAIService {
  constructor(apiKey)
  async generateResponse(conversationContext, profile, advertContext?)
  async selectImage(availableImages, conversationContext)
  buildPrompt(conversationContext, profile, advertContext?)
}
```

**Context Structure**:

```javascript
const conversationContext = {
  messages: [...], // Previous messages
  participant: {...}, // Other participant info
  phase: 'engagement|cta|converted', // Current conversation phase
  metrics: {...}, // Conversation metrics
  mode: 'basis|premium' // Chat mode
}
```

### 4. Profile Manager (`ProfileManager`)

**Purpose**: Manage bot configuration profiles

**Key Methods**:

```javascript
class ProfileManager {
  async createProfile(name, config)
  async updateProfile(profileId, config)
  async deleteProfile(profileId)
  async loadProfile(profileId)
  async listProfiles()
  async exportProfile(profileId)
  async importProfile(profileData)
}
```

**Profile Structure**:

```javascript
const profile = {
  id: 'uuid',
  name: 'Profile Name',
  persona: {
    name: 'Anna',
    age: 25,
    gender: 'female',
    style: 'youthful|mature',
    details: 'Detailed persona description'
  },
  messaging: {
    dayTimeTemplates: [...],
    nightTimeTemplates: [...],
    characterLimit: 200
  },
  behavior: {
    language: 'de',
    enableMeetingDecline: true,
    enableTranslation: false,
    enableLanguageDetection: true,
    enableContinuation: true
  },
  location: {
    city: 'Berlin',
    timezone: 'Europe/Berlin',
    enableLocationMatching: false,
    enableRandomCity: false
  },
  cta: {
    messages: [...],
    pricing: {...}
  },
  images: [
    {
      id: 'uuid',
      filename: 'image.jpg',
      tags: ['flirty', 'casual', 'selfie'],
      base64Data: '...'
    }
  ],
  advertConfig: { // For basis mode only
    title: 'Advert Title',
    text: 'Advert description text',
    personality: 'Specific personality for this advert'
  }
}
```

### 5. Conversation Tracker (`ConversationTracker`)

**Purpose**: Track conversation metrics and phases

**Key Methods**:

```javascript
class ConversationTracker {
  async updateConversationPhase(threadId, phase)
  async incrementMessageCount(threadId)
  async trackCTAShared(threadId)
  async trackConversion(threadId)
  async getConversationMetrics(threadId)
  async generateTooltipData(threadId)
  async isNewChat(unreadCount, totalCount) // Returns true if unreadCount === totalCount === 1
  async shouldProcessConversation(threadId, chatMode) // Determines if conversation should be processed
}
```

**Conversation State Structure**:

```javascript
const conversationState = {
  threadId: "string",
  phase: "initial|engagement|cta|converted|post-conversion",
  startTime: timestamp,
  totalMessageExchanges: number,
  currentLoopExchanges: number,
  phaseStartTime: timestamp,
  lastMessageType: "string",
  lastObjection: "string|null",
  hasSharedCTA: boolean,
  hasConverted: boolean,
  isExcluded: boolean,
};
```

### 6. UI Manager (`UIManager`)

**Purpose**: Handle DOM manipulation and visual indicators

**Key Methods**:

```javascript
class UIManager {
  async injectStatusIndicators()
  async updateStatusIndicator(threadId, status)
  async createTooltip(threadId, metrics)
  async detectChatMode() // Returns 'basis' or 'premium'
  async extractAdvertInfo(threadElement)
}
```

**DOM Selectors for Chat Type Detection**:

- **Basis Chat Detection**: Look for `h2.clsy-c-mbx-threads-item__title` elements containing advert titles
- **Thread Elements**: `.clsy-c-mbx-threads-item__inner` containers
- **Participant Names**: `h3.clsy-c-mbx-threads-item__nickname`
- **Message Previews**: `.clsy-c-mbx-threads-item__message`
- **Unread Badges**: `.clsy-count-badge-content` (number of unread messages)
- **Total Message Count**: `.clsy-c-mbx-threads-item__messagecount` (total messages in conversation)
- **Profile URLs**: `a.clsy-c-mbx-threads-item__profile-link[href]` and `[data-profile-url]`

**New Chat Detection Logic**:

- **New Chat**: When unread count (`.clsy-count-badge-content`) equals total message count (`.clsy-c-mbx-threads-item__messagecount`) and both equal 1
- **Existing Chat**: When unread count is less than total message count or total > 1

**User ID Extraction from DOM**:

- **Profile URLs**: Extract from `href="https://www.markt.de/username/userId,{ID}/profile.htm"`
- **Data Attributes**: Extract from `data-profile-url` attributes

**Status Indicator Types**:

- 🟢 Converted
- 🔵 Active/Engagement
- 🟡 CTA Phase
- ⚪ Initial Contact
- 🔴 Excluded

### 7. Storage Manager (`StorageManager`)

**Purpose**: Handle local data persistence

**Key Methods**:

```javascript
class StorageManager {
  async saveProfile(profile)
  async loadProfile(profileId)
  async saveConversationState(threadId, state)
  async loadConversationState(threadId)
  async saveImage(imageData)
  async loadImage(imageId)
  async clearData()
}
```

## Data Models

### Message Model

```javascript
const message = {
  messageId: 'string',
  messageDate: {
    epochTime: 'string',
    prettyFormattedDate: 'string'
  },
  seenByOther: boolean,
  sentFromMe: boolean,
  messageText: {
    type: 'KText.Plain',
    plain: 'string'
  },
  sharedImages: [
    {
      sizedSources: [...],
      srcPrefix: 'string',
      lazyLoad: boolean
    }
  ]
}
```

### Thread Model (✅ Verified from API Response)

```javascript
const thread = {
  threadId: 'string', // e.g., "2192657861"
  lastMessageHtml: 'string', // e.g., "Hast du Telegram?"
  lastMessageId: 'string', // e.g., "20596277582"
  lastMessageByMe: boolean,
  lastMessageDate: {
    epochTime: 'string', // e.g., "1754488253000"
    prettyFormattedDate: 'string', // e.g., "Heute, vor 9 Min."
    prettyFormattedDateExpiresOn: 'string'
  },
  numberOfTotalMessages: number, // e.g., 3
  numberOfUnreadMessages: number, // e.g., 1 (null if no unread)
  titleText: 'string', // Advert title for basis chats, e.g., "Na du erbärmliches ZahIschwein, schon wieder hier?"
  otherParticipantName: 'string', // e.g., "Tarantino96"
  otherParticipantProfileUrl: 'string', // e.g., "https://www.markt.de/tarantino96/userId,24766335/profile.htm"
  otherParticipantImage: {
    isOnline: boolean,
    profileImage: {
      src: 'string',
      lazyLoad: boolean
    }
  },
  otherParticipantInactive: boolean,
  lastMessageHasSharedImages: boolean,
  // Chat type determined by which group this appears in:
  // - normalGroup = basis chat (advert-related)
  // - premiumGroup = premium chat (general)
}
```

### Conversation Classification Logic

```javascript
const conversationData = {
  threadId: thread.threadId,
  otherParticipantId: extractUserIdFromUrl(thread.otherParticipantProfileUrl), // e.g., "24766335"
  otherParticipantName: thread.otherParticipantName,
  chatType: thread.groupType, // "basis" or "premium" (determined by API response group)
  advertTitle: thread.titleText, // For basis chats only
  unreadCount: thread.numberOfUnreadMessages,
  totalMessages: thread.numberOfTotalMessages,
  isNewChat: thread.numberOfUnreadMessages === thread.numberOfTotalMessages && thread.numberOfTotalMessages === 1,
  lastMessageByMe: thread.lastMessageByMe,
  lastUpdate: thread.lastMessageDate.epochTime
}
```

### Participant Model

```javascript
const participant = {
  name: "string",
  profileImage: {
    profileImage: { src: "string" },
    isOnline: boolean,
    isPremium: boolean,
  },
  profileUrl: "string",
  isOnline: boolean,
  isInactive: boolean,
  hasNewNickname: boolean,
};
```

## Error Handling

### Error Categories

1. **API Errors**: Network failures, authentication issues, rate limiting
2. **AI Service Errors**: API quota exceeded, generation failures
3. **Storage Errors**: Local storage quota, data corruption
4. **DOM Errors**: Element not found, page navigation issues

### Error Handling Strategy

```javascript
class ErrorHandler {
  async handleApiError(error, context)
  async handleAIError(error, context)
  async handleStorageError(error, context)
  async handleDOMError(error, context)
  async logError(error, context, severity)
}
```

**Error Logging Format**:

```javascript
const errorLog = {
  timestamp: Date.now(),
  type: 'api|ai|storage|dom',
  severity: 'low|medium|high|critical',
  message: 'string',
  context: {...},
  stackTrace: 'string',
  userAgent: 'string',
  url: 'string'
}
```

## Testing Strategy

### Unit Testing

- **API Client**: Mock markt.de endpoints, test request/response handling
- **AI Service**: Mock Gemini API, test prompt generation and response parsing
- **Profile Manager**: Test CRUD operations, validation, import/export
- **Conversation Tracker**: Test state transitions, metrics calculation
- **Storage Manager**: Test data persistence, retrieval, error handling

### Integration Testing

- **End-to-End Conversation Flow**: Test complete conversation automation
- **Mode Switching**: Test basis vs premium mode behavior
- **Profile Application**: Test profile loading and configuration application
- **Error Recovery**: Test graceful degradation and error recovery

### Browser Testing

- **Chrome Extension APIs**: Test extension permissions and API usage
- **DOM Manipulation**: Test status indicator injection and tooltip creation
- **Session Persistence**: Test data persistence across browser restarts
- **Performance**: Test memory usage and processing efficiency

## Security Considerations

### Data Protection

- **Local Storage Encryption**: Encrypt sensitive profile data and conversation history
- **API Key Security**: Secure storage of AI service API keys
- **Session Management**: Proper handling of markt.de session cookies

### Privacy

- **Data Minimization**: Only store necessary conversation data
- **User Consent**: Clear disclosure of data collection and usage
- **Data Retention**: Implement data cleanup and retention policies

### Extension Security

- **Content Security Policy**: Strict CSP to prevent XSS attacks
- **Permission Minimization**: Request only necessary browser permissions
- **Code Obfuscation**: Protect against reverse engineering

## Performance Optimization

### Efficiency Measures

- **Request Batching**: Batch API calls where possible to reduce network overhead
- **Caching Strategy**: Cache conversation data and user profiles locally
- **Lazy Loading**: Load images and non-critical data on demand
- **Background Processing**: Use service workers for non-blocking operations

### Resource Management

- **Memory Management**: Implement proper cleanup of event listeners and timers
- **Storage Optimization**: Compress stored data and implement cleanup routines
- **Rate Limiting**: Implement intelligent rate limiting to avoid API throttling

### API Usage Patterns (Based on Intercepted Data)

- **Message Polling**: checkForUpdates called every ~5-10 seconds when in active conversation
- **Thread Refresh**: getThreads called when switching between inbox views
- **Message Loading**: getMessages called when opening specific conversations
- **URL Encoding**: Text messages are URL-encoded (e.g., "test\n" becomes "test%0A")
- **Image Upload**: POST to `/uploadMbxImage.ajx` returns fileId for use in submitMessage
- **Image Constraints**: Max 10MB file size, 2000x2000px dimensions, .jpg format supported
- **Single Image Limit**: Only one image per message supported
- **Image Format**: Downloaded images are in .webp format, but .jpg uploads are supported
- **Authentication**: Browser session cookies are sufficient, no additional tokens required
- **Rate Limiting**: No observed rate limiting from markt.de

## Implementation Notes

### Critical Implementation Details
- **File ID Generation**: Server-side generation via `/uploadMbxImage.ajx` endpoint
- **Image Format Handling**: Support .jpg uploads, handle .webp downloads
- **Session Management**: Rely on existing browser session cookies
- **Error Handling**: Implement verbose logging for debugging (no specific error patterns observed yet)
- **New Chat Priority**: Prioritize conversations where unread count === total count === 1

### Testing Recommendations
- **Live Testing**: Use Anna-Fae chat for testing message and image sending
- **API Interception**: Continue monitoring API calls during development
- **Rate Limit Testing**: Monitor for any rate limiting behavior during bulk operations
- **Error Scenario Testing**: Test various failure scenarios and document error responses

## Deployment and Distribution

### Build Process

1. **Code Compilation**: Bundle and minify JavaScript code
2. **Asset Optimization**: Compress images and optimize resources
3. **Manifest Generation**: Generate Chrome extension manifest
4. **Testing**: Run automated test suite
5. **Packaging**: Create distributable .crx file

### Distribution Strategy

- **Chrome Web Store**: Primary distribution channel
- **Direct Installation**: Support for developer mode installation
- **Update Mechanism**: Automatic updates through Chrome Web Store

### Monitoring and Analytics

- **Error Tracking**: Implement error reporting and tracking
- **Usage Analytics**: Track feature usage and performance metrics
- **User Feedback**: Collect user feedback and feature requests

## Future Enhancements

### Planned Features

1. **Multi-AI Support**: Integration with OpenAI, Claude, and other AI services
2. **Advanced Analytics**: Detailed conversation analytics and reporting
3. **Team Collaboration**: Multi-user support and shared profiles
4. **Mobile Support**: Extension for mobile browsers
5. **API Integration**: Direct integration with OnlyFans and other platforms

### Scalability Considerations

- **Cloud Storage**: Optional cloud backup for profiles and data
- **Distributed Processing**: Support for multiple browser instances
- **Enterprise Features**: Advanced management and reporting tools
