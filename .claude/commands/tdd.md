---
name: tdd
description: TDD workflow using two agents - one writes failing tests, another implements code to pass them
---

# TDD Dual-Agent Workflow

Execute TDD using two specialized agents working in sequence:

1. **Test Agent**: Writes failing tests following TDD principles
2. **Implementation Agent**: Makes tests pass with minimal code

## Usage

When user runs `/tdd [feature description]`:

1. **Launch Test Agent** with Task tool:
   - Agent type: `general-purpose`
   - Task: Write failing test for `[feature description]`
   - Requirements:
     * Write ONE minimal test showing desired behavior
     * Test must fail (watch it fail with `npm test`)
     * Verify failure is for right reason (missing feature, not syntax error)
     * Use clear test name describing behavior
     * No mocks unless absolutely necessary
     * Stop after test verified failing - DO NOT implement

2. **Launch Implementation Agent** with Task tool:
   - Agent type: `general-purpose`
   - Task: Implement minimal code to pass the failing test
   - Requirements:
     * Write simplest code to make test pass
     * Run tests to verify all pass
     * No extra features beyond what test requires
     * Refactor only after green
     * Report when done

## Test Framework Setup

If no test framework exists:
1. Ask user which framework (Jest, Vitest, etc.)
2. Set up minimal config
3. Create first test file

## Cycle Continuation

After both agents complete:
- Ask user if they want to continue with next test
- Repeat cycle for next behavior
- Keep tests small and focused

## Example Flow

User: `/tdd add user authentication`

You respond:
```
Launching Test Agent to write failing test for user authentication...

[Agent 1 writes test, verifies it fails]

Launching Implementation Agent to make test pass...

[Agent 2 implements minimal code, verifies test passes]

Test cycle complete. Ready for next test? (yes/no)
```

## Important Rules

- NEVER write code before test fails
- NEVER write tests and implementation in same agent
- NEVER skip verification steps
- Test agents MUST stop after RED verification
- Implementation agents MUST start with failing test

Follow `.conventional-commits.md` for any commits.
