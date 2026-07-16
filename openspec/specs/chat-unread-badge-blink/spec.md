# chat-unread-badge-blink Specification

## Purpose

TBD - created by archiving change 'chat-unread-badge-blink'. Update Purpose after archive.

## Requirements

### Requirement: Unread badge blinking state

The chat unread-count badge SHALL blink with a 3-second interval while the underlying unread count for its conversation (or, for the header aggregate, for any conversation) is greater than zero.

#### Scenario: New unread message arrives

- **WHEN** a conversation's unread count transitions from 0 to a value greater than 0
- **THEN** the badge for that conversation SHALL display the new count and SHALL start blinking with a 3-second interval

##### Example: single new message

- **GIVEN** a conversation with `unread = 0` and no badge visible
- **WHEN** one new message arrives, making `unread = 1`
- **THEN** the badge SHALL display "1" and SHALL be in the blinking state


<!-- @trace
source: chat-unread-badge-blink
updated: 2026-07-16
code:
  - src/app/globals.css
  - src/components/chat/ConversationList.tsx
  - src/services/caseShareService.ts
  - src/components/features/cases/ShareCasePanel.tsx
  - src/components/layout/ChatHeaderButton.tsx
  - src/types/caseShare.ts
  - supabase/migrations/20260716120000_add_case_share_rejection.sql
  - src/app/dark-theme.css
  - src/components/chat/hooks/useBlinkingBadge.ts
  - src/components/features/cases/edit-case/useCaseShares.ts
tests:
  - src/components/chat/hooks/__tests__/useBlinkingBadge.test.ts
  - src/services/__tests__/caseShareService.test.ts
-->

---
### Requirement: Displayed count persists after read

The chat unread-count badge SHALL continue to display its last known unread count after the user reads the conversation, even though the underlying unread count has returned to zero.

#### Scenario: User reads conversation with unread messages

- **WHEN** the user opens a conversation whose unread count is greater than 0, triggering the existing read-marking flow, and the underlying unread count subsequently becomes 0
- **THEN** the badge SHALL stop blinking immediately
- **AND** the badge SHALL continue to display the unread count value that was shown immediately before the read event, unchanged

##### Example: read after 3 unread messages

- **GIVEN** a conversation badge displaying "3" in the blinking state
- **WHEN** the user opens the conversation and the read-marking flow completes, bringing the underlying unread count to 0
- **THEN** the badge SHALL display "3" and SHALL NOT be in the blinking state


<!-- @trace
source: chat-unread-badge-blink
updated: 2026-07-16
code:
  - src/app/globals.css
  - src/components/chat/ConversationList.tsx
  - src/services/caseShareService.ts
  - src/components/features/cases/ShareCasePanel.tsx
  - src/components/layout/ChatHeaderButton.tsx
  - src/types/caseShare.ts
  - supabase/migrations/20260716120000_add_case_share_rejection.sql
  - src/app/dark-theme.css
  - src/components/chat/hooks/useBlinkingBadge.ts
  - src/components/features/cases/edit-case/useCaseShares.ts
tests:
  - src/components/chat/hooks/__tests__/useBlinkingBadge.test.ts
  - src/services/__tests__/caseShareService.test.ts
-->

---
### Requirement: Blinking resumes on new unread message after read

After a conversation has been read and its badge is frozen and non-blinking, the badge SHALL resume blinking and update its displayed count as soon as the underlying unread count becomes greater than 0 again.

#### Scenario: New message arrives after read

- **WHEN** a conversation's badge is frozen at a non-zero displayed count with blinking stopped, and a new message arrives that makes the underlying unread count greater than 0
- **THEN** the badge SHALL update its displayed count to the new underlying unread count
- **AND** the badge SHALL resume blinking with a 3-second interval

##### Example: read then one new message

- **GIVEN** a conversation badge frozen at "3", not blinking, after being read
- **WHEN** exactly one new message arrives, making the underlying unread count 1
- **THEN** the badge SHALL display "1" and SHALL resume blinking


<!-- @trace
source: chat-unread-badge-blink
updated: 2026-07-16
code:
  - src/app/globals.css
  - src/components/chat/ConversationList.tsx
  - src/services/caseShareService.ts
  - src/components/features/cases/ShareCasePanel.tsx
  - src/components/layout/ChatHeaderButton.tsx
  - src/types/caseShare.ts
  - supabase/migrations/20260716120000_add_case_share_rejection.sql
  - src/app/dark-theme.css
  - src/components/chat/hooks/useBlinkingBadge.ts
  - src/components/features/cases/edit-case/useCaseShares.ts
tests:
  - src/components/chat/hooks/__tests__/useBlinkingBadge.test.ts
  - src/services/__tests__/caseShareService.test.ts
-->

---
### Requirement: Zero-count badge stays hidden

If a conversation has never had any unread messages, its badge SHALL remain hidden and non-blinking.

#### Scenario: No unread messages ever

- **WHEN** a conversation's underlying unread count has always been 0 since the badge component mounted
- **THEN** the badge SHALL NOT be displayed and SHALL NOT blink


<!-- @trace
source: chat-unread-badge-blink
updated: 2026-07-16
code:
  - src/app/globals.css
  - src/components/chat/ConversationList.tsx
  - src/services/caseShareService.ts
  - src/components/features/cases/ShareCasePanel.tsx
  - src/components/layout/ChatHeaderButton.tsx
  - src/types/caseShare.ts
  - supabase/migrations/20260716120000_add_case_share_rejection.sql
  - src/app/dark-theme.css
  - src/components/chat/hooks/useBlinkingBadge.ts
  - src/components/features/cases/edit-case/useCaseShares.ts
tests:
  - src/components/chat/hooks/__tests__/useBlinkingBadge.test.ts
  - src/services/__tests__/caseShareService.test.ts
-->

---
### Requirement: Header aggregate badge reflects any blinking conversation

The site-wide chat header badge SHALL blink whenever at least one conversation's badge is in the blinking state, and SHALL display the sum of all conversations' displayed counts.

#### Scenario: One of several conversations has a new unread message

- **WHEN** one conversation among several has a newly arrived unread message (blinking) while the others are either at zero or frozen non-blinking
- **THEN** the header badge SHALL blink
- **AND** the header badge SHALL display the sum of all conversations' currently displayed counts

##### Example: mixed conversation states

| Conversation | Underlying unread | Displayed count | Blinking |
| ------------ | ------------------ | ---------------- | -------- |
| A            | 2 (new)             | 2                 | yes      |
| B            | 0 (frozen after read) | 3              | no       |
| C            | 0 (never unread)    | 0                 | no       |

- **GIVEN** the conversations above
- **WHEN** the header badge is rendered
- **THEN** the header badge SHALL display "5" and SHALL blink (because conversation A is blinking)

<!-- @trace
source: chat-unread-badge-blink
updated: 2026-07-16
code:
  - src/app/globals.css
  - src/components/chat/ConversationList.tsx
  - src/services/caseShareService.ts
  - src/components/features/cases/ShareCasePanel.tsx
  - src/components/layout/ChatHeaderButton.tsx
  - src/types/caseShare.ts
  - supabase/migrations/20260716120000_add_case_share_rejection.sql
  - src/app/dark-theme.css
  - src/components/chat/hooks/useBlinkingBadge.ts
  - src/components/features/cases/edit-case/useCaseShares.ts
tests:
  - src/components/chat/hooks/__tests__/useBlinkingBadge.test.ts
  - src/services/__tests__/caseShareService.test.ts
-->