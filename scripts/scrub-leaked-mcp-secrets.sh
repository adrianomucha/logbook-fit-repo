#!/usr/bin/env bash
#
# Rewrite git history to redact the secrets that were committed in .mcp.json
# (commit e11bc86, 2026-02-27) and stayed in history after the file was
# cleaned up in July 2026. See SECURITY_INCIDENT_MCP_TOKEN.md.
#
# This redacts the secret VALUES everywhere they appear, instead of deleting
# .mcp.json from history. The current .mcp.json (which reads
# ${SUPABASE_ACCESS_TOKEN} from the environment) is left untouched.
#
# Usage:
#   scripts/scrub-leaked-mcp-secrets.sh <repo-url>            # dry run: rewrite a fresh mirror clone, verify, do not push
#   scripts/scrub-leaked-mcp-secrets.sh <repo-url> --push     # rewrite AND force-push every branch and tag
#
# Requirements: git >= 2.22 and git-filter-repo (brew install git-filter-repo,
# or pip install git-filter-repo). Run it from anywhere; it never touches the
# checkout you run it from.
#
# --push rewrites every branch and tag on the remote. Afterwards every clone
# (yours, Vercel's, collaborators') must be re-cloned, and GitHub support must
# be asked to purge cached views of the old commits:
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

set -euo pipefail

REPO_URL="${1:-}"
MODE="${2:-dry-run}"
LEAK_COMMIT="${LEAK_COMMIT:-e11bc86}"

if [[ -z "$REPO_URL" ]]; then
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi
if [[ "$MODE" != "dry-run" && "$MODE" != "--push" ]]; then
  echo "second argument must be --push or omitted" >&2
  exit 2
fi
if ! git filter-repo --version >/dev/null 2>&1; then
  echo "git-filter-repo is not installed: brew install git-filter-repo  (or: pip install git-filter-repo)" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/scrub-mcp.XXXXXX")"
MIRROR="$WORK/repo.git"
REPLACEMENTS="$WORK/replacements.txt"
echo "working in $WORK"

# filter-repo insists on a fresh clone, so it can never damage a working checkout.
git clone --quiet --mirror "$REPO_URL" "$MIRROR"

# Pull the secret values out of the leaking commit itself, so this script
# never has to contain them.
LEAKED_FILE="$(git -C "$MIRROR" show "$LEAK_COMMIT:.mcp.json")"
{
  # Supabase personal access token(s)
  grep -oE 'sbp_[a-f0-9]{40}' <<<"$LEAKED_FILE" | sort -u | sed 's/$/==>***REMOVED-SUPABASE-ACCESS-TOKEN***/'
  # Framer / unframer MCP endpoint id + secret (query-string values)
  grep -oE '[?&](id|secret)=[A-Za-z0-9]+' <<<"$LEAKED_FILE" | sed -E 's/^[?&](id|secret)=//' | sort -u | sed 's/$/==>***REMOVED-FRAMER-MCP-SECRET***/'
} > "$REPLACEMENTS"

COUNT="$(grep -c . "$REPLACEMENTS" || true)"
if [[ "$COUNT" -eq 0 ]]; then
  echo "no secrets found in $LEAK_COMMIT:.mcp.json — nothing to scrub (already rewritten?)" >&2
  exit 1
fi
echo "redacting $COUNT secret value(s) across all history"

git -C "$MIRROR" filter-repo --replace-text "$REPLACEMENTS" --force

# Verify: none of the literal values may survive in any reachable object.
echo "verifying..."
LEFT=0
while IFS= read -r line; do
  literal="${line%%==>*}"
  if git -C "$MIRROR" rev-list --all | xargs -n 500 git -C "$MIRROR" grep -q -F "$literal" 2>/dev/null; then
    echo "  STILL PRESENT: ${literal:0:10}…" >&2
    LEFT=1
  fi
done < "$REPLACEMENTS"
if [[ "$LEFT" -ne 0 ]]; then
  echo "verification failed; not pushing. Inspect $MIRROR" >&2
  exit 1
fi
echo "verified: no leaked value remains in any commit, branch, or tag"

if [[ "$MODE" != "--push" ]]; then
  cat <<MSG

Dry run complete. Rewritten mirror is at:
  $MIRROR

To publish the rewrite (force-pushes EVERY branch and tag):
  scripts/scrub-leaked-mcp-secrets.sh "$REPO_URL" --push
MSG
  exit 0
fi

# filter-repo deliberately removes the origin remote; put it back and push.
git -C "$MIRROR" remote add origin "$REPO_URL"
git -C "$MIRROR" push --force --all origin
git -C "$MIRROR" push --force --tags origin

cat <<MSG

Pushed rewritten history for every branch and tag.

Still to do (git cannot do these for you):
  1. Ask GitHub support to purge cached views and any forks of the old commits:
     https://support.github.com/request/remove-data
  2. Re-clone every checkout of this repo (local, Vercel, collaborators):
     old clones will otherwise re-push the leaked commits.
  3. Close and reopen any PR that GitHub marks as having an unknown head.
MSG
