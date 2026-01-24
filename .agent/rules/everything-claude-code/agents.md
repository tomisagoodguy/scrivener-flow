# Agent Delegation & Parallelism

## When to Delegate

Delegate to specialized sub-agents when:
- **Feature Planning**: Use `planner` for multi-step implementations
- **Code Review**: Use `code-reviewer` before merging or on complex edits
- **Bug Hunting**: Use `tester` or `debugger` for elusive issues
- **Documentation**: Use `doc-updater` for keeping README/docs in sync
- **Security Audit**: Use `security-reviewer` for sensitive auth/data logic

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth.ts
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utils.ts

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
