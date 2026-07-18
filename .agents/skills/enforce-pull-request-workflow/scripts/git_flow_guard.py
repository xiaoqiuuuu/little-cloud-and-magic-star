#!/usr/bin/env python3
"""Fail fast when a repository change would bypass the branch-and-PR workflow."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def git(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args],
        text=True,
        capture_output=True,
        check=False,
    )
    if check and result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed")
    return result.stdout.strip()


def fail(message: str) -> None:
    print(f"BLOCKED: {message}", file=sys.stderr)
    raise SystemExit(1)


def current_branch() -> str:
    branch = git("branch", "--show-current")
    if not branch:
        fail("detached HEAD is not allowed for repository changes")
    return branch


def verify_write(branch: str, protected: set[str]) -> None:
    if branch in protected:
        names = ", ".join(sorted(protected))
        fail(f"current branch is '{branch}'. Create a task branch before writing; protected: {names}")
    print(f"OK: writes may proceed on task branch '{branch}'")


def verify_pr(branch: str, protected: set[str], remote: str, base: str) -> None:
    verify_write(branch, protected)

    if git("diff", "--cached", "--quiet", check=False) or git(
        "diff", "--cached", "--name-only"
    ):
        fail("staged changes remain; commit the task changes before creating the Pull Request")

    upstream = git(
        "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}", check=False
    )
    if not upstream:
        fail("the task branch has no upstream; run 'git push -u origin HEAD'")

    base_ref = f"{remote}/{base}"
    if not git("rev-parse", "--verify", base_ref, check=False):
        fail(f"remote base '{base_ref}' is unavailable; fetch it before creating the PR")

    ahead = int(git("rev-list", "--count", f"{base_ref}..HEAD"))
    if ahead < 1:
        fail(f"branch '{branch}' has no commits ahead of '{base_ref}'")

    unstaged = git("status", "--porcelain")
    if unstaged:
        print("WARNING: unrelated or uncommitted worktree changes remain and must stay out of the PR")

    print(
        f"OK: branch '{branch}' tracks '{upstream}' and is {ahead} commit(s) ahead of '{base_ref}'"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("write", "pr"))
    parser.add_argument("--base", default="main")
    parser.add_argument("--remote", default="origin")
    parser.add_argument(
        "--protected",
        action="append",
        default=[],
        help="additional protected branch name; may be repeated",
    )
    args = parser.parse_args()

    try:
        root = Path(git("rev-parse", "--show-toplevel"))
    except RuntimeError as exc:
        fail(f"not inside a Git repository: {exc}")

    protected = {"main", "master", args.base, *args.protected}
    branch = current_branch()
    print(f"Repository: {root}")

    if args.phase == "write":
        verify_write(branch, protected)
    else:
        verify_pr(branch, protected, args.remote, args.base)


if __name__ == "__main__":
    main()
