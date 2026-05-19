## ADDED Requirements

### Requirement: Webhook endpoint validates LINE signature

The system SHALL verify the `X-Line-Signature` header on every incoming request using HMAC-SHA256 with `LINE_CHANNEL_SECRET`. Requests that fail signature validation SHALL be rejected with HTTP 400 and no event processing SHALL occur.

#### Scenario: Valid signature accepted

- **WHEN** a Webhook POST arrives with a correct `X-Line-Signature` header
- **THEN** the system SHALL process the events in the request body

#### Scenario: Invalid signature rejected

- **WHEN** a Webhook POST arrives with an incorrect or missing `X-Line-Signature` header
- **THEN** the system SHALL return HTTP 400 and SHALL NOT process any events

#### Scenario: Missing LINE_CHANNEL_SECRET

- **WHEN** the `LINE_CHANNEL_SECRET` environment variable is not set
- **THEN** the system SHALL return HTTP 500 for all Webhook requests

### Requirement: Friend messages are forwarded to the admin

The system SHALL forward text messages received from non-admin users to the admin (`LINE_USER_ID`) in a relay format that includes the sender's display name and a reply instruction.

#### Scenario: Friend sends a text message

- **WHEN** a `message` event is received with `source.userId` not equal to `LINE_USER_ID`
- **THEN** the system SHALL send a Push Message to `LINE_USER_ID` with the format:
  `[好友 {display_name}] {original_text}\n\n↩ 回覆：@{display_name} 你的訊息`
- **AND** if the sender's `display_name` is not found in `line_followers`, the system SHALL use the raw `source.userId` as fallback

#### Scenario: Admin's own message event is ignored

- **WHEN** a `message` event is received with `source.userId` equal to `LINE_USER_ID`
- **AND** the message text does NOT start with `@`
- **THEN** the system SHALL ignore the event and return HTTP 200

### Requirement: Admin @reply command is dispatched to the target friend

The system SHALL parse messages sent by the admin that start with `@nickname` and SHALL deliver the remaining text as a Push Message to the matching friend's User ID.

#### Scenario: Admin sends a valid @reply command

- **WHEN** a `message` event is received from the admin with text matching the pattern `@{nickname} {message}`
- **AND** a record with `display_name = nickname` exists in `line_followers` with `is_active = true`
- **THEN** the system SHALL send a Push Message to that friend's `user_id` containing only `{message}`

#### Scenario: Nickname not found

- **WHEN** the admin sends `@{nickname} {message}` but no active `line_followers` record matches the nickname
- **THEN** the system SHALL send a Push Message to the admin with: `找不到好友「{nickname}」，請確認暱稱是否正確`

#### Scenario: Admin sends a message without @ prefix

- **WHEN** a `message` event is received from the admin and the text does NOT start with `@`
- **THEN** the system SHALL ignore the message silently

##### Example: @reply dispatch

| Admin input | Matching `display_name` | Result |
|---|---|---|
| `@小明 2330 值得關注` | `小明` (userId=`U123`) | Push `2330 值得關注` to `U123` |
| `@阿花 今天賣了` | `阿花` (userId=`U456`) | Push `今天賣了` to `U456` |
| `@nobody 哈囉` | (no match) | Push error msg to admin |

### Requirement: Non-text message events from friends receive a canned reply

The system SHALL respond with a fixed canned message when a friend sends a non-text message type (e.g., sticker, image, audio).

#### Scenario: Friend sends a sticker or image

- **WHEN** a `message` event with type other than `text` is received from a non-admin user
- **THEN** the system SHALL send a Push Message to the friend: `目前只支援文字訊息，謝謝！`
