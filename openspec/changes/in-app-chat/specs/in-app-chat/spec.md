## ADDED Requirements

### Requirement: Users can discover and start conversations without approval

The system SHALL allow any authenticated user to retrieve a list of all other authenticated users and start a new conversation with one or more of them without requiring an invitation or approval step.

#### Scenario: User opens the new conversation picker

- **WHEN** an authenticated user opens the "new conversation" picker
- **THEN** the system displays every other authenticated user's email and name, and selecting one or more users immediately creates (or reuses) a conversation without any pending/approval state

#### Scenario: Selecting a single user creates a direct conversation

- **WHEN** the user selects exactly one other user and confirms
- **THEN** the system creates a 1:1 conversation (`is_group = false`) between the two users, or reuses an existing 1:1 conversation between the same two users if one already exists

#### Scenario: Selecting multiple users creates a group conversation

- **WHEN** the user selects two or more other users, provides a group name, and confirms
- **THEN** the system creates a group conversation (`is_group = true`) with all selected users plus the creator as members

### Requirement: Users can send and receive messages in real time

The system SHALL persist every sent message and deliver it to all online members of the conversation without requiring a manual page refresh.

#### Scenario: Message delivery to an online recipient

- **WHEN** user A, who shares a conversation with user B, sends a message and user B currently has that conversation open
- **THEN** the message is persisted to storage and user B's screen displays the new message without B refreshing the page

##### Example: two-party direct conversation

- **GIVEN** users A and B have an existing 1:1 conversation with no prior messages
- **WHEN** A sends the message "測試訊息"
- **THEN** the message is stored with `sender_id = A`, `conversation_id` = the shared conversation, and B's open conversation view shows "測試訊息" attributed to A

#### Scenario: Message send failure is surfaced, not silently dropped

- **WHEN** a message insert fails (e.g. network error or RLS rejection)
- **THEN** the system marks that message as failed to send in the sender's UI and does NOT broadcast it to other members

### Requirement: Conversation list shows unread counts

The system SHALL track, per conversation member, the timestamp of their last read position and compute an unread count by comparing it against the conversation's messages.

#### Scenario: New message increases unread count for other members

- **WHEN** a message is sent in a conversation
- **THEN** every member of that conversation other than the sender SHALL see the conversation's unread count increase, reflected in both the conversation list and the sidebar total badge

#### Scenario: Opening a conversation clears its unread count

- **WHEN** a member opens a conversation whose unread count is greater than zero
- **THEN** the system updates that member's `last_read_at` for the conversation to the current time, and the unread count for that conversation becomes zero and stays zero after a page reload

### Requirement: Access to conversations and messages is restricted to members

The system SHALL restrict read and write access to `conversations`, `conversation_members`, and `messages` rows to authenticated users who are members of the relevant conversation.

#### Scenario: Non-member cannot read a conversation's messages

- **WHEN** an authenticated user who is not a member of conversation X issues a direct query against the `messages` table filtered to conversation X
- **THEN** the system (via Row Level Security) returns no rows for conversation X

#### Scenario: Non-member cannot insert a message into a conversation

- **WHEN** an authenticated user who is not a member of conversation X attempts to insert a message with `conversation_id = X`
- **THEN** the system (via Row Level Security) rejects the insert

### Requirement: Sidebar entry point with unread badge

The system SHALL provide a chat entry point in the application sidebar that displays the total unread message count across all of the user's conversations.

#### Scenario: Badge reflects total unread count

- **WHEN** the user has unread messages across one or more conversations
- **THEN** the sidebar chat icon displays a badge with the sum of unread counts across all conversations; the badge is hidden when the total is zero
