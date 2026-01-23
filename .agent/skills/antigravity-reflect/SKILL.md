---
name: claude-reflect
description: Self-learning system that captures corrections, preferences, and mistakes during sessions to update CLAUDE.md. Use when the user makes a correction ("no, use X"), mentions a preference ("always do Y"), explicitly asks to remember something, or runs /reflect commands.
---

# Claude Reflect - Self-Learning System

A two-stage system that helps Claude Code learn from user corrections and update project context.

## 🧠 Trigger Conditions

**Activate this skill when:**

1. **User Corrections:** "No, use X", "Don't do that", "Actually, I prefer..."
2. **Explicit Memory:** "Remember this for next time", "Add this to your rules."
3. **Reflect Commands:** `/reflect`, `/reflect --scan-history`, `/view-queue`.
4. **Context Updates:** User updates a convention or rule that should be persisted.

## 🛠️ Scripts & Tools

While hooks handle most capture automatically, you can manually verify or manage the system using these scripts in `.agent/skills/antigravity-reflect/scripts/`:

| Script | Usage | Description |
|--------|-------|-------------|
| `capture_learning.py` | `python scripts/capture_learning.py "correction text"` | Manually capture a learning item if the hook missed it. |
| `check_learnings.py` | `python scripts/check_learnings.py --status` | Check status of the learning queue. |
| `extract_session_learnings.py` | `python scripts/extract_session_learnings.py <session_path>` | Scan a session file for missed learnings. |

## 💡 How It Works

1. **Capture (Stage 1):**
    * **Automatic:** `UserPromptSubmit` hook detects patterns and appends to `~/.claude/learnings-queue.json`.
    * **Manual:** You can call `capture_learning.py` if a user explicitly asks you to "remember this" and you want to ensure it's queued.

2. **Process (Stage 2):**
    * User runs `/reflect`.
    * You interactively review the queue and decide where to apply learnings:
        * `~/.claude/CLAUDE.md`: Global knowledge.
        * `./CLAUDE.md`: Project-specific conventions.
        * `SKILL.md`: Updates to specific skills (e.g., "update the git skill to use -v").

## 📝 Examples

### Example 1: Automatic Capture & Reflect

**User:** "No, always use `uv run` for python commands."
**System:** (Hook captures "Always use `uv run` for python commands" to queue)
**Claude:** "Understood. I will use `uv run` for python commands."
...
**User:** "/reflect"
**Claude:** "I have 1 queued learning: 'Always use `uv run` for python commands'. Should I add this to `./CLAUDE.md`?"

### Example 2: Manual Capture (Edge Case)

**User:** "I want you to remember that this project uses Python 3.12, but don't write it to file yet."
**Claude:** (Recognizes explicit memory request)
*Action:* Runs `python .agent/skills/antigravity-reflect/scripts/capture_learning.py "Project uses Python 3.12"`
**Claude:** "I've queued that learning for your next `/reflect` session."

## ⚠️ Edge Cases

* **Queue Corrupted:** If `/reflect` fails, try clearing the queue manually or checking valid JSON in `~/.claude/learnings-queue.json`.
* **False Positives:** If the hook captures something irrelevant, user can skip it during `/reflect` review.
* **Duplicate Rules:** Always check existing `CLAUDE.md` content before adding new rules to avoid conflicts.
