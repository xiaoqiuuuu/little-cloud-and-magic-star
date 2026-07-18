#!/usr/bin/env python3
"""Fail fast when a repository change would bypass the branch-and-PR workflow."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


MAX_MANUAL_TEXT_LINES = 1_000
GENERATED_DEPENDENCY_FILES = {
    "bun.lock",
    "bun.lockb",
    "package-lock.json",
    "Pipfile.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "uv.lock",
    "yarn.lock",
}


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


def tracked_paths() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(message or "git ls-files failed")
    return [Path(os.fsdecode(raw)) for raw in result.stdout.split(b"\0") if raw]


def verify_line_limits(root: Path) -> None:
    violations: list[tuple[Path, int]] = []
    for relative_path in tracked_paths():
        if relative_path.name in GENERATED_DEPENDENCY_FILES:
            continue
        path = root / relative_path
        if path.is_symlink() or not path.is_file():
            continue
        data = path.read_bytes()
        if b"\0" in data[:8_192]:
            continue
        line_count = data.count(b"\n") + (1 if data and not data.endswith(b"\n") else 0)
        if line_count > MAX_MANUAL_TEXT_LINES:
            violations.append((relative_path, line_count))

    if violations:
        details = ", ".join(f"{path} ({count} lines)" for path, count in violations)
        fail(
            f"hand-maintained text files must not exceed {MAX_MANUAL_TEXT_LINES} lines: "
            f"{details}"
        )
    print(
        f"OK: tracked hand-maintained text files are at most {MAX_MANUAL_TEXT_LINES} lines"
    )


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
    parser.add_argument("phase", choices=("write", "lines", "pr"))
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
    elif args.phase == "lines":
        verify_write(branch, protected)
        verify_line_limits(root)
    else:
        verify_pr(branch, protected, args.remote, args.base)
        verify_line_limits(root)


if __name__ == "__main__":
    main()
