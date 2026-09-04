# Security incident: Supabase access token committed to a public repo

**Status: OPEN until every box below is ticked.** Work top to bottom.

## What leaked

Commit `e11bc86` (2026-02-27, "chore: iCloud build fix, rich seed data, and
dependency updates") added `.mcp.json` with live values instead of
placeholders:

| Secret | Grants |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` (`sbp_b584…`) | Full Supabase **Management API** access to the whole account: mint DB credentials, read connection strings, connect to Postgres as owner, pause or delete projects. Bypasses RLS and every app-level guard. |
| Framer / unframer MCP `id` + `secret` | Read/edit access to the Framer site through the MCP endpoint. Framer is no longer used and the server entry was dropped in July, so this is only live if the unframer endpoint or Framer account still exists. |
| `SUPABASE_PROJECT_REF` (`lbpuqjwmvwzdfzykxlci`) | Not a secret by itself, but it tells an attacker exactly which project the token unlocks. |

The values were removed from the file on 2026-07-06 (`5437778`) and 2026-07-07
(`b2ec7eb`, `f9f5d10`), but history was never rewritten. Verified on
2026-09-04: the old file is still served unauthenticated from
`raw.githubusercontent.com` at `e11bc86`, and the token is present in 192
blobs reachable from `main` and 100+ branches. Treat it as harvested.

## Remediation checklist

Order matters. Revoking the token is the only step that actually closes the
hole; the history rewrite only stops new scrapers from finding it.

- [ ] **1. Revoke the token now.** Supabase Dashboard → Account → Access
      Tokens → delete `sbp_b584…`. Do not assume GitHub's secret scanning
      already did it (this repo does not have Advanced Security enabled, so it
      did not). Mint a new token, and put it only in your shell environment /
      `.env` (never in a tracked file). The tracked `.mcp.json` already reads
      `${SUPABASE_ACCESS_TOKEN}` from the environment; keep it that way.
- [ ] **2. Look for abuse since 2026-02-27.** Supabase Dashboard →
      Organization → Audit Logs (and the project's Auth / Postgres logs).
      Anything you don't recognise means the database must be treated as
      breached:
      - [ ] rotate the database password (Project Settings → Database),
      - [ ] rotate `NEXTAUTH_SECRET` and `CRON_SECRET` in Vercel,
      - [ ] force a password reset for every user, and consider notifying them
            (emails, coach ↔ client messages, and client health notes were
            reachable).
- [ ] **3. Make sure the Framer side is dead.** Framer is no longer used, so
      there is nothing to rotate. Instead, confirm the unframer MCP endpoint
      (and, if you no longer need it, the Framer account) is deleted. The
      leaked `id` + `secret` keep working for as long as that endpoint exists.
      The scrub script still redacts both values from history.
- [ ] **4. Scrub the git history.** Run, from anywhere (it never touches your
      working copy):

      ```bash
      brew install git-filter-repo        # or: pip install git-filter-repo
      scripts/scrub-leaked-mcp-secrets.sh https://github.com/adrianomucha/logbook-fit-repo            # dry run + verification
      scripts/scrub-leaked-mcp-secrets.sh https://github.com/adrianomucha/logbook-fit-repo --push     # force-pushes every branch and tag
      ```

      The script redacts the secret *values* in every commit (rather than
      deleting `.mcp.json`, which would also delete today's correct file),
      verifies nothing survived, and only pushes when you pass `--push`.
      After the push:
      - [ ] ask GitHub support to purge cached views and forks:
            <https://support.github.com/request/remove-data>
            (<https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository>),
      - [ ] re-clone every checkout (local, Vercel re-deploys from GitHub so
            it is fine; any collaborator clone will otherwise re-push the old
            commits),
      - [ ] the 100+ `claude/*` branches are rewritten too; open PRs keep
            working, closed ones may show "unknown head". That is expected.
- [ ] **5. Keep it from happening again.** CI now runs
      [gitleaks](https://github.com/gitleaks/gitleaks) on every push and PR
      (`.github/workflows/ci.yml`, job `secrets`) and fails on any credential
      in the diff. Locally, `git diff --cached | gitleaks stdin` before
      committing catches it earlier.

## Timeline

| Date | Event |
| --- | --- |
| 2026-02-27 | `e11bc86` commits `.mcp.json` with live Supabase PAT + Framer MCP secret |
| 2026-07-06 | `5437778` removes the values from the tracked file; history untouched |
| 2026-07-07 | `b2ec7eb`, `f9f5d10` finish the cleanup, drop the Framer server |
| 2026-09-04 | Exposure re-verified from a public, unauthenticated fetch; this runbook and the scrub script added |
