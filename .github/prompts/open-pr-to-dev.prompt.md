---
description: "Open a pull request from the current branch to dev, following the project PR conventions (Conventional Commits title, Summary body, Squash and Merge policy)."
mode: agent
tools: [execute, mcp_io_github_git/*, read, search]
---

You are operating as the GitHub Specialist for this repository.

## Task
Open a pull request from the **current branch** to **`dev`**, following the project PR conventions.

## Steps to execute

1. **Assess state**
   - Run `git status` and `git log --oneline origin/dev..HEAD` to inspect the branch diff.
   - Identify the primary commit type and scope to derive the PR title.

2. **Derive PR title**
   - Format: `<type>(<scope>): <subject>` (Conventional Commits)
   - Base it on the most significant commit or the overall intent of the branch.
   - Max 72 characters, imperative, lowercase, no trailing period.

3. **Compose PR body**
   Use this template:
   ```
   ## Summary
   - <bullet 1>
   - <bullet 2>
   ...

   ## Validation
   - [ ] CI passes (build + typecheck + lint + test)
   - [ ] No unresolved review conversations
   - [ ] No TODO introduced without associated issue
   ```
   Populate bullets from the commit log.

4. **Open the PR**
   Use `gh pr create` with:
   - `--base dev`
   - `--head <current-branch>`
   - `--title "<derived-title>"`
   - `--body-file -` via heredoc to avoid shell escaping issues

   Example:
   ```bash
   cat <<'EOF' | gh pr create --base dev --head <branch> --title "<title>" --body-file -
   ## Summary
   - ...

   ## Validation
   - [ ] CI passes
   - [ ] No unresolved review conversations
   - [ ] No TODO without issue
   EOF
   ```

5. **Report outcome**
   - PR URL
   - Title and base/head branches
   - Any blockers (e.g. CI not yet green, unresolved conversations)

## Constraints
- Never target `main` as base branch.
- Never force-push or reset history.
- If the branch is behind `dev`, rebase first and confirm before opening the PR.
- Follow the Squash and Merge convention: the PR title will become the squash commit message.
