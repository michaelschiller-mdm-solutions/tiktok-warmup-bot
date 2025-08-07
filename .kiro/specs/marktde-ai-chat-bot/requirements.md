# Requirements Document

## Introduction

This document outlines the requirements for developing an AI-powered chat bot system for markt.de that can automatically engage with users through direct messages. The system will function similarly to CupidBot AI, providing automated conversation management with the goal of building social connections and driving conversions to OnlyFans subscriptions. The bot will scan inboxes, react to notifications, read and respond to chats, save conversations, and use AI to generate contextually appropriate responses that create authentic social bonds with users.

## Requirements

### Requirement 1

**User Story:** As a markt.de account operator, I want the bot to automatically scan my inbox for incoming messages, so that I can respond to all potential leads without manually checking messages.

#### Acceptance Criteria

1. WHEN the bot is active THEN it SHALL continuously monitor the markt.de inbox for new messages
2. WHEN a new message is detected THEN the bot SHALL capture the sender information and message content
3. WHEN scanning the inbox THEN the bot SHALL identify unread messages and prioritize them for response
4. WHEN multiple conversations are active THEN the bot SHALL maintain a queue of conversations requiring attention
5. IF the inbox fails to load THEN the bot SHALL retry with exponential backoff up to 5 attempts

### Requirement 2

**User Story:** As a markt.de account operator, I want the bot to react to browser notifications for new messages, so that I can respond immediately to high-priority conversations.

#### Acceptance Criteria

1. WHEN a browser notification appears for a new message THEN the bot SHALL intercept and process the notification
2. WHEN a notification is processed THEN the bot SHALL extract the sender information and preview text
3. WHEN a high-priority notification is detected THEN the bot SHALL prioritize that conversation in the response queue
4. IF notification permissions are denied THEN the bot SHALL provide fallback polling mechanisms
5. WHEN notifications are processed THEN the bot SHALL log the notification data for conversation tracking

### Requirement 3

**User Story:** As a markt.de account operator, I want the bot to read existing chat conversations, so that it can understand the context and history before responding.

#### Acceptance Criteria

1. WHEN opening a conversation THEN the bot SHALL read and parse all previous messages in the thread
2. WHEN reading messages THEN the bot SHALL identify the sender, timestamp, and message content for each message
3. WHEN parsing conversations THEN the bot SHALL maintain chronological order of messages
4. WHEN conversation history is loaded THEN the bot SHALL analyze the conversation stage and user engagement level
5. IF a conversation cannot be read THEN the bot SHALL log the error and skip to the next conversation

### Requirement 4

**User Story:** As a markt.de account operator, I want the bot to save all conversation data, so that I can track engagement metrics and conversation progress over time.

#### Acceptance Criteria

1. WHEN a conversation is processed THEN the bot SHALL save all message data to persistent storage
2. WHEN saving conversations THEN the bot SHALL include sender info, timestamps, message content, and response status
3. WHEN conversation data is stored THEN the bot SHALL maintain conversation threading and relationships
4. WHEN saving data THEN the bot SHALL track conversation metrics including response times and engagement levels
5. IF storage fails THEN the bot SHALL queue the data for retry and alert the user

### Requirement 5

**User Story:** As a markt.de account operator, I want the bot to respond to chats without clicking on individual conversations, so that I can maintain efficiency and avoid detection.

#### Acceptance Criteria

1. WHEN responding to messages THEN the bot SHALL send replies without opening individual chat windows
2. WHEN sending responses THEN the bot SHALL use direct API calls or DOM manipulation to submit messages
3. WHEN multiple conversations need responses THEN the bot SHALL process them in batch without UI navigation
4. WHEN sending messages THEN the bot SHALL respect rate limits to avoid triggering anti-spam measures
5. IF a response fails to send THEN the bot SHALL retry up to 3 times with increasing delays

### Requirement 6

**User Story:** As a markt.de account operator, I want the bot to use AI to generate contextually appropriate responses, so that conversations feel natural and build authentic connections.

#### Acceptance Criteria

1. WHEN generating responses THEN the bot SHALL use AI to create contextually relevant messages based on conversation history
2. WHEN crafting messages THEN the bot SHALL maintain consistent personality and tone throughout conversations
3. WHEN responding THEN the bot SHALL incorporate social manipulation techniques to build emotional connections
4. WHEN generating content THEN the bot SHALL avoid repetitive or obviously automated language patterns
5. IF AI generation fails THEN the bot SHALL use fallback template responses appropriate to the conversation stage

### Requirement 7

**User Story:** As a markt.de account operator, I want the bot to track conversation phases and conversion metrics with visual indicators, so that I can quickly assess conversation status and measure effectiveness.

#### Acceptance Criteria

1. WHEN processing conversations THEN the bot SHALL track conversation phases (initial contact, engagement, CTA phase, converted, post-conversion)
2. WHEN tracking metrics THEN the bot SHALL record conversation start time, total message exchanges, message exchanges per loop, phase start time, last message type, and objection handling
3. WHEN displaying conversations THEN the bot SHALL show visual status icons next to each conversation indicating current phase
4. WHEN hovering over status icons THEN the bot SHALL display detailed conversation analytics including current phase, conversation duration, message counts, CTA status, conversion status, and conversation ID
5. WHEN a conversation reaches CTA phase THEN the bot SHALL track whether CTA link has been shared and monitor for conversions

### Requirement 8

**User Story:** As a markt.de account operator, I want a user interface within the browser extension to configure bot settings and monitor performance, so that I can control the automation and track results.

#### Acceptance Criteria

1. WHEN the extension is loaded THEN it SHALL provide a user interface for bot configuration and monitoring
2. WHEN configuring the bot THEN the user SHALL be able to set message templates, response delays, and AI parameters
3. WHEN monitoring performance THEN the interface SHALL display real-time conversation metrics and bot status
4. WHEN managing conversations THEN the user SHALL be able to pause/resume automation and manually intervene
5. IF the bot encounters errors THEN the interface SHALL display error messages and suggested actions

### Requirement 11

**User Story:** As a markt.de account operator, I want hover tooltips on conversation status icons that show detailed analytics and quick actions, so that I can quickly assess and manage individual conversations.

#### Acceptance Criteria

1. WHEN hovering over conversation status icons THEN the bot SHALL display a tooltip with current phase, conversation started time, total message exchanges, message exchanges this loop, phase started time, last message type, last objection, CTA sharing status, conversion status, and conversation ID
2. WHEN displaying tooltips THEN the bot SHALL include quick action buttons for "Exclude" and "Mark not converted"
3. WHEN clicking "Exclude" THEN the bot SHALL remove the conversation from active automation
4. WHEN clicking "Mark not converted" THEN the bot SHALL reset the conversion status for that conversation
5. WHEN tooltips are displayed THEN they SHALL use color coding to indicate conversation health and phase status

### Requirement 12

**User Story:** As a markt.de account operator, I want visual status indicators next to each conversation that show the current conversation phase and priority, so that I can quickly identify which conversations need attention.

#### Acceptance Criteria

1. WHEN displaying conversations THEN the bot SHALL show colored status icons indicating conversation phase (green for converted, blue for active, etc.)
2. WHEN conversations have unread messages THEN the bot SHALL display message count badges
3. WHEN conversations are in different phases THEN the bot SHALL use distinct visual indicators (checkmarks for converted, chat bubbles for active, hearts for engagement phase)
4. WHEN conversations require immediate attention THEN the bot SHALL use visual priority indicators
5. WHEN status changes occur THEN the bot SHALL update visual indicators in real-time

### Requirement 9

**User Story:** As a markt.de account operator, I want comprehensive bot configuration settings including persona, messaging templates, and behavioral controls, so that I can customize the bot's personality and conversation strategy.

#### Acceptance Criteria

1. WHEN configuring the bot THEN I SHALL be able to set persona details including name, age, gender, chatting style (youthful/mature), and detailed model information
2. WHEN setting up messaging THEN I SHALL be able to configure day time and night time message templates with character limits (200 characters)
3. WHEN configuring behavior THEN I SHALL be able to set language preferences, enable/disable meeting decline responses, translation features, language detection, and conversation continuation settings
4. WHEN setting location THEN I SHALL be able to configure city, timezone, location matching, and random city features
5. WHEN managing conversation sources THEN I SHALL be able to select from multiple platforms (Tinder, etc.) and configure source-specific settings

### Requirement 14

**User Story:** As a markt.de account operator, I want the bot to integrate with external AI services for message generation, so that I can leverage advanced language models for more sophisticated responses.

#### Acceptance Criteria

1. WHEN generating responses THEN the bot SHALL integrate with external AI APIs (OpenAI, Gemini, etc.)
2. WHEN calling AI services THEN the bot SHALL include conversation context, user profile information, and configured persona details
3. WHEN receiving AI responses THEN the bot SHALL validate and sanitize the generated content
4. WHEN AI services are unavailable THEN the bot SHALL gracefully fallback to template-based responses
5. IF API limits are reached THEN the bot SHALL queue requests and implement appropriate retry logic

### Requirement 15

**User Story:** As a markt.de account operator, I want the bot to support CTA (Call-to-Action) configuration and image uploads, so that I can customize conversion strategies and send multimedia content.

#### Acceptance Criteria

1. WHEN configuring CTAs THEN I SHALL be able to set custom CTA messages with character limits and pricing information
2. WHEN uploading images THEN the bot SHALL store and manage image assets for use in conversations
3. WHEN sending messages THEN the AI SHALL be able to select and send appropriate images based on conversation context
4. WHEN managing media THEN the bot SHALL support multiple image formats and provide image preview functionality
5. WHEN using CTAs THEN the bot SHALL track CTA delivery and measure conversion effectiveness

### Requirement 17

**User Story:** As a markt.de account operator, I want the bot to distinguish between premium chat and basis (advert) chat types, so that I can apply different conversation strategies based on the chat context.

#### Acceptance Criteria

1. WHEN detecting chat types THEN the bot SHALL identify premium chats (general conversations) versus basis chats (advert-related messages)
2. WHEN processing basis chats THEN the bot SHALL require advert content to be provided for AI context
3. WHEN configuring personalities THEN I SHALL be able to set different personality profiles for different advert types
4. WHEN responding in basis chats THEN the AI SHALL use the advert content and associated personality to generate contextually appropriate responses
5. WHEN switching between chat types THEN the bot SHALL automatically adjust its conversation strategy and personality

### Requirement 18

**User Story:** As a markt.de account operator, I want to provide advert content and set specific personalities for basis chats, so that the AI can respond appropriately to advert-related inquiries.

#### Acceptance Criteria

1. WHEN setting up basis chat automation THEN I SHALL be able to input the advert content (title and text) that the chat is related to
2. WHEN configuring advert personalities THEN I SHALL be able to create and assign different personality profiles for different types of adverts
3. WHEN managing images THEN I SHALL be able to upload .jpg images with tags so the AI knows when to use specific images in conversations
4. WHEN the AI generates responses THEN it SHALL use the provided advert content as context for understanding user inquiries
5. WHEN responding to advert inquiries THEN the AI SHALL maintain the assigned personality while staying relevant to the advert content
6. WHEN managing multiple adverts THEN the bot SHALL track which personality and content applies to each conversation thread

### Requirement 10

**User Story:** As a markt.de account operator, I want the bot to implement conversation loops that track message exchanges within phases, so that I can manage conversation progression and avoid over-messaging.

#### Acceptance Criteria

1. WHEN starting a new conversation phase THEN the bot SHALL initialize a new loop counter
2. WHEN sending messages within a phase THEN the bot SHALL increment the loop message counter
3. WHEN a phase completes THEN the bot SHALL reset the loop counter and start a new loop for the next phase
4. WHEN tracking loop metrics THEN the bot SHALL maintain both total message exchanges and current loop message exchanges
5. IF a loop exceeds maximum message thresholds THEN the bot SHALL escalate or change conversation strategy

### Requirement 13

**User Story:** As a developer, I want the bot to intercept and analyze markt.de API calls to understand the platform's communication protocols, so that I can implement direct API communication without relying on DOM manipulation.

#### Acceptance Criteria

1. WHEN the extension loads THEN it SHALL implement API interception to capture markt.de network requests and responses
2. WHEN intercepting API calls THEN the bot SHALL log message sending endpoints, conversation loading endpoints, and authentication mechanisms
3. WHEN analyzing API responses THEN the bot SHALL document the data structures for conversations, messages, and user profiles
4. WHEN reverse engineering is complete THEN the bot SHALL use direct API calls instead of DOM manipulation for reading and sending messages
5. WHEN detecting chat types THEN the bot SHALL identify basis chats by the presence of advert titles in the conversation thread HTML structure (clsy-c-mbx-threads-item__title)
6. IF API interception fails THEN the bot SHALL fallback to DOM-based interaction methods

### Requirement 16

**User Story:** As a markt.de account operator, I want the bot to maintain session persistence across browser restarts, so that conversations and automation continue seamlessly.

#### Acceptance Criteria

1. WHEN the browser is restarted THEN the bot SHALL restore previous session state and continue automation
2. WHEN session data is saved THEN it SHALL include conversation queues, user preferences, and automation status
3. WHEN restoring sessions THEN the bot SHALL validate that markt.de authentication is still valid using existing browser session cookies
4. WHEN resuming automation THEN the bot SHALL pick up from the last processed conversation
5. WHEN errors occur THEN the bot SHALL log verbose error information for debugging purposes
6. IF session restoration fails THEN the bot SHALL start fresh and log the restoration error

### Requirement 19

**User Story:** As a markt.de account operator, I want to run separate bot instances for basis and premium chats, so that I can apply different automation strategies for each chat type.

#### Acceptance Criteria

1. WHEN configuring the bot THEN I SHALL be able to run one instance specifically for basis (advert-related) chats
2. WHEN configuring the bot THEN I SHALL be able to run one instance specifically for premium (general) chats
3. WHEN running in basis mode THEN the bot SHALL only process conversations that contain advert titles and require advert context
4. WHEN running in premium mode THEN the bot SHALL only process general conversations without advert context requirements
5. WHEN operating in either mode THEN the bot instances SHALL remain completely separate and independent

### Requirement 20

**User Story:** As a markt.de account operator, I want to save and manage bot configuration settings as reusable profiles, so that I can easily switch between different automation strategies and mix and match settings.

#### Acceptance Criteria

1. WHEN configuring bot settings THEN I SHALL be able to save the complete configuration as a named profile
2. WHEN managing profiles THEN I SHALL be able to create, edit, delete, and duplicate configuration profiles
3. WHEN switching profiles THEN I SHALL be able to quickly load any saved profile to apply its settings to the current bot instance
4. WHEN creating profiles THEN I SHALL be able to include persona details, messaging templates, behavioral controls, CTA settings, image collections with tags, and advert-specific configurations
5. WHEN using profiles THEN the bot SHALL maintain a default profile and allow easy switching between multiple saved profiles
6. WHEN exporting/importing THEN I SHALL be able to backup and restore profile configurations for sharing or migration purposes