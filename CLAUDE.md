# CLAUDE.md — Project-wide guidance

This file provides shared guidance to Claude Code (claude.ai/code) for the whole
`easytennis` repository. It holds the rules that apply to **both** the backend
(`api/`) and the frontend (`frontend/`): the application's business rules, the
mandatory development protocol, and the GitHub workflow.

Package-specific guidance (stack, commands, architecture, local run) lives in
`api/CLAUDE.md` and `frontend/CLAUDE.md`.

---

## Application & Business Rules

EasyTennis is a **mobile-first** web app for tracking tennis game days in court
rental arenas. A user logs game days, tracks their cost, and splits the bill
among the players who attended.

**Core rules:**

- A **game day** records: date, number of courts rented, hours played, total
  rental price, and the players who attended.
- Each user keeps a **reusable roster** of players (`PlayerProfile`, per-user).
  When building a game day, attendees are picked from that roster.
- A **player has a name** (no email — players are not application users and need
  no contact details). Roster entries are distinct by id; duplicate names are
  allowed.
- The **cost split** = `total price ÷ number of selected payers`, rounded to two
  decimals. The payers can be any subset of the game day's attendees (the people
  who play are not always the people who pay).

**Domain model:**

- **User** — the application user / authentication principal: display name,
  email (the login identifier), hashed password. *(This email is the account
  login — unrelated to players.)*
- **GameDay** — date, number of courts, number of hours, total price, list of
  players; owned by a User.
- **Player** — value-object snapshot embedded in a GameDay (not its own table):
  name + a nullable `profileId` linking back to the roster entry it came from.
  A `null`/stale `profileId` means an ad-hoc or removed player (an "orphan"),
  preserved on the game day but no longer in the roster.
- **PlayerProfile** — a user's reusable roster entry: id, name.

---

## Development Protocol (MANDATORY)

> ### ⛔ ABSOLUTE RULE — NEVER declare a task finished without completing EVERY step
>
> You may **NEVER**, and I repeat **NEVER**, assume, claim, report, or imply that a
> task is "done", "complete", "ready", or "passing" until you have **actually run
> every single applicable step** of the After-every-change checklist below **and
> confirmed each one succeeded with real output** — not predicted, not assumed,
> not skipped.
>
> - Run each step. Do not reason about whether it would pass — execute it and read the result.
> - If a step cannot be run, is skipped, or fails, you MUST say so explicitly and stop —
>   never paper over it or describe the task as complete.
> - "Compiles" / "builds" is NOT "done". The task is done only when **every applicable
>   step below plus the DECISIONS.md write-up have each been executed and verified to succeed.**
> - When you report status, map every step to a concrete result (pass / fail / skipped-with-reason).
>   A green claim without evidence is a protocol violation.

### Before every change

1. ALWAYS read `DECISIONS.md` at the root folder before starting any changes. If
   there are risks or unresolved dependencies related to other decisions, prompt
   the user for guidance.
2. Divide the change into small tasks.
3. Write a log entry for the commit message / PR description:

```
[LOG - <ISO 8601 timestamp>]
Change: <what the change is>
Reason: <why it is needed>
Approach: <how it will be implemented>
```

### After every change — run EVERY applicable step and verify each succeeds

**Backend (`api/`):**
1. Run all unit and integration tests: `mvnw.cmd test` (Windows) / `./mvnw test`.
   Integration tests must hit a real PostgreSQL database — **never mock the DB**.
2. Lint if configured (Checkstyle / SpotBugs). Check for code smells: God
   classes, long methods, feature envy, magic numbers.

**Frontend (`frontend/`):**
1. Run `npm run build` — catches TypeScript errors.
2. Run `eslint .` — lint.

**Shared (both stacks):**
3. Review for new risks and uncovered edge cases (null inputs, empty lists,
   boundary values, duplicates, unauthorised access); document them.
4. Review the codebase for security issues (use the security-reviewer skill /
   `docs/SECURITY-REVIEW.md` checklist).
5. Formal self-review — answer and **document** in `DECISIONS.md`: What was the
   purpose of these changes? Was the purpose fulfilled? What was the expected
   result? Was it achieved? Do the tools, code, and design patterns align with
   the conventions of the project? Return findings for fixing.
6. Verify **no** secrets, API URLs, tokens, or docker-compose variables are
   hardcoded — all must live in `.env` files.

### After the change review

Write a summary of progress, key decisions made, and next steps into
`DECISIONS.md`, with the timestamp of the change.

### Definition of Done

A pull request can ONLY be submitted after EVERY step of the Development Protocol
has been completed, the backend and frontend run successfully without any errors,
all problems and risks have been resolved, and every detail of the change has
been documented in `DECISIONS.md`.

**This is non-negotiable: a task is NOT finished — and must never be described as
finished — until every applicable After-every-change step above has been actually
executed and verified to succeed, and the `DECISIONS.md` entry is written. If any
step was not run or did not pass, the task is unfinished by definition; say so
plainly instead of reporting completion.**

---

## GitHub Workflow

- The root `easytennis/` folder is a GitHub repository.
- Every development task must be done on a **new branch** created from `master`.
- Open a **Pull Request to `master`** for every branch — include the pre-change
  `[LOG]` entry and the post-change review in the PR description.
- Do not merge without passing tests, build, and lint.

### Pull Request Guidelines

- **Command:** Use `gh pr create --draft` to initiate PRs so they can be reviewed
  before going live.
- **Title format:** Use Conventional Commits (e.g., `feat(auth): add login flow`).
- **Description template:** Always include:
  - **Summary:** a brief overview of the changes.
  - **Testing:** the specific commands run to verify the change (e.g., `mvnw.cmd test`, `npm run build`).
  - **Issue reference:** link to the relevant issue (e.g., `Closes #123`).
- **Review:** before finalizing, use `gh pr diff` to double-check the changes.
