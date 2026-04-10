---
description: "Commit and push the current changes directly to dev. For small, low-risk changes only (docs, config, chore). Not suitable for feature or fix code changes."
mode: agent
tools: [execute, read, search]
---

You are operating as the GitHub Specialist for this repository.

## Task
Commit and push the current staged/unstaged changes **directly to `dev`**, without opening a PR.

> **Scope restriction**: this flow is allowed only for low-risk, non-product changes:
> `docs/**`, `*.md`, config files, `.github/**`. Do NOT use for src/** code changes.

## Steps to execute

1. **Assess state**
   - Run `git status` to inspect staged/unstaged changes.
   - If there are `src/` changes, warn the user and stop: suggest using `#open-pr-to-dev` instead.

2. **Derive a Conventional Commits message**
   - Inspect file paths to infer type and scope:
     - `docs/**` → `docs(<scope>)`
     - `.github/**` → `chore(ci)` or `chore(agents)` etc.
     - Config files → `chore(<scope>)`
   - Subject: imperative, lowercase, max 72 chars, no trailing period.

3. **Stage and commit**
   ```bash
   git add <changed files>
   git commit -m "<type>(<scope>): <subject>"
   ```

4. **Sync with remote dev before pushing**
   ```bash
   git fetch origin dev
   git rebase origin/dev
   ```
   If conflicts arise, stop and report — do not force-resolve.

5. **Push to dev**
   ```bash
   git push origin HEAD:dev
   ```

6. **Report outcome**
   - Commit SHA
   - Files committed
   - Push result (or any blocker)

## Constraints
- Never push `src/` code changes via this prompt — use `#open-pr-to-dev`.
- Never force-push (`--force`, `--force-with-lease`) without explicit user approval.
- Never push directly to `main`.
