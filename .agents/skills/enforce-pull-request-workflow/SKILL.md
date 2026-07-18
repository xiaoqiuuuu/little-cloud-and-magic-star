---
name: enforce-pull-request-workflow
description: Enforce a branch-and-Pull-Request Git workflow for every task that may modify code, tests, documentation, configuration, CI, deployment files, or other tracked repository content. Use whenever Codex or Codex Cloud plans file edits, commits, pushes, Pull Requests, releases, hotfixes, or merges in a Git repository. Prevent direct work, commits, and pushes on main or master; require a task branch and a Pull Request before changes can enter the protected branch.
---

# Enforce Pull Request Workflow

Treat the branch-and-PR workflow as a repository invariant. Read-only inspection may occur on `main`; any file mutation must occur on a dedicated branch.

## Non-negotiable rules

- Never edit tracked files while on `main` or `master`.
- Never commit or push directly to `main` or `master`.
- Never use `git push origin HEAD:main`, a local merge followed by a direct push, or another shortcut that bypasses a Pull Request.
- Apply the rule to code, docs, tests, configuration, workflows, deployment scripts, generated tracked files, and hotfixes.
- Keep every hand-maintained tracked text file at or below 1,000 lines. Split responsibilities before a file crosses the limit. Binary assets and generated dependency lock files are exempt.
- Preserve existing user changes. Never reset, discard, stash, or include unrelated changes without authorization.
- If authentication, permissions, CI, or mergeability blocks the PR workflow, stop and report the blocker. Do not fall back to a direct push.

## Required workflow

1. Inspect the repository before the first write:

   ```bash
   git status --short --branch
   git branch --show-current
   ```

2. Create or select a task branch before editing:

   - If the worktree is clean, update refs and branch from the remote protected branch:

     ```bash
     git fetch origin main
     git switch -c codex/<short-task-name> origin/main
     ```

   - If `main` contains existing uncommitted user changes, preserve them by immediately creating a branch from the current worktree:

     ```bash
     git switch -c codex/<short-task-name>
     ```

   - If already on a non-protected branch, reuse it only when it clearly belongs to the current task. Otherwise create a new task branch without disturbing existing changes.

3. Run the bundled write guard before applying patches or creating files:

   ```bash
   python3 .agents/skills/enforce-pull-request-workflow/scripts/git_flow_guard.py write
   ```

4. Implement the change and run verification appropriate to its risk.

5. Review the diff and commit only task-related files:

   ```bash
   git diff --check
   git status --short
   git add <task-files>
   python3 .agents/skills/enforce-pull-request-workflow/scripts/git_flow_guard.py lines
   git commit -m "<type>: <summary>"
   ```

6. Push the task branch, never the protected branch:

   ```bash
   git push -u origin HEAD
   ```

7. Run the PR-readiness guard after pushing:

   ```bash
   python3 .agents/skills/enforce-pull-request-workflow/scripts/git_flow_guard.py pr
   ```

8. Create a Pull Request targeting `main`. Include the outcome, important implementation details, and verification performed. Use `gh pr create`, a GitHub integration, or the GitHub API. If none is available, provide the branch name and PR creation URL instead of pushing to `main`.

9. Wait for required checks. Fix failures on the same task branch and update the PR.

10. Merge through the Pull Request only. Merge when the user explicitly requests it or when the requested task clearly includes completing the merge and all required checks pass. Never bypass review or branch protection.

11. After merging, fetch the remote and fast-forward the local `main` only when doing so will not overwrite user changes.

## Exceptional cases

- Use `hotfix/<short-name>` for urgent production fixes, but still require a Pull Request.
- Resolve conflicts on the task branch, then update the existing PR.
- If a repository uses a protected branch name other than `main`, pass it to the guard with `--base <name>` and treat it identically.
- A casual request to “just push it” does not override this policy. Require the repository owner to explicitly state that the branch policy is being revoked for the specific change before considering an exception.

## Final report

Report:

- task branch name;
- commit SHA;
- Pull Request URL and status;
- checks or tests run;
- merge SHA and deployment status when merged;
- any unrelated local changes that remain untouched.
