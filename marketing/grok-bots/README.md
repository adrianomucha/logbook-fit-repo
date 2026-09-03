# Grok group-finder bots

A few small "bots" that use Grok (xAI) with its built-in web search to find
**US Facebook groups where Logbook.fit's future users — independent fitness
coaches — already hang out**, and keep them in one deduplicated lead list.

Each bot is a persona hunting one slice of the ICP:

| Bot | Looking for |
|-----|-------------|
| `pt-independent` | Independent personal trainers running their own client roster |
| `online-coaching` | Online / hybrid fitness coaches |
| `strength-coaches` | S&C, powerlifting, weightlifting, CrossFit-style coaches |
| `nutrition-hybrid` | Nutrition & health coaches who also program training |
| `gym-studio-owners` | Small gym / private studio owners who coach |

A run makes one Grok research call per **query × region**. Grok searches the
web (and optionally X) itself, returns groups as JSON, and the CLI merges them
into `out/groups.json` + `out/groups.csv`. A second **verifier** pass re-checks
each URL and pulls member count, privacy, rules and activity.

## Setup

1. Get an API key at <https://console.x.ai> and add to `.env`:

   ```env
   XAI_API_KEY="xai-..."
   # optional
   GROK_MODEL="grok-4.5"           # default; grok-4.6 is stronger and ~4× the price
   GROK_REASONING_EFFORT="low"     # unset = model default
   ```

2. `npm install` (already done if you run the app).

## Run

```bash
npm run grok-bots -- --list                       # see bots
npm run grok-bots -- --all --dry-run              # print prompts, no API calls
npm run grok-bots -- --all                        # every bot, nationwide (17 calls)
npm run grok-bots -- --bot pt-independent --regions 5   # + top 5 US metros
npm run grok-bots -- --bot online-coaching --region "Texas" --region "Florida"
npm run grok-bots -- --verify                     # verify every unverified URL
npm run grok-bots -- --all --regions 10 --verify  # the full thing
```

Flags: `--limit <n>` groups per call (default 15), `--concurrency <n>`
(default 2), `--force` to redo combos already in `out/state.json`,
`--model`, `--reasoning low|medium|high`, `--no-x-search`.

Runs are **idempotent and resumable**: every finished (bot, query, region)
combo is recorded in `out/state.json` and skipped next time, and results are
written after every call, so you can Ctrl-C and re-run. Region list lives in
`bots.ts` (`US_REGIONS`): 23 metros, then 18 states.

## Output

`out/groups.csv` — one row per unique group, sorted verified → fit → size:

| column | meaning |
|--------|---------|
| `fit_score` | 5 = independent coaches talking client management/business … 1 = poor fit |
| `verified` | `true` verifier confirmed it exists and is US; `false` rejected; empty = not checked |
| `privacy`, `members_estimate`, `region`, `audience` | what's publicly visible |
| `promo_policy` | what the group rules say about self-promotion, when visible |
| `activity_signal` | e.g. "10+ posts/day", "last post 2024" |
| `bots`, `sources` | which bots found it and where |

`out/groups.json` is the same data with everything (queries, timestamps,
rationale) — treat it as the source of truth and the CSV as the export.
`out/raw/` keeps every raw API response (gitignored) for debugging empty or
odd results.

Dedup key is the canonical group URL (`m.`/`www.`/`/about`/query strings
collapsed), falling back to the normalised name for groups Grok found but
couldn't link; a later sighting with the URL upgrades that row.

## Cost

Rough: a discovery call is ~5–15k input tokens (search results) and ~2k
output. On grok-4.5 that is a few cents per call; `--all --regions 10` is
~190 calls. The summary line at the end prints token totals (and dollars,
when the API returns `cost_usd`). Check current prices at
<https://docs.x.ai/developers/models>.

## Guardrails (read this)

- **Discovery only.** These bots search the public web; they never log into
  Facebook, join groups, scrape members, or post. Automating a Facebook
  account is against Meta's terms and gets accounts banned — do the joining
  and posting yourself.
- **Respect group rules.** `promo_policy` is there so you don't get kicked
  on day one. Value-first posts (retention tips, check-in templates) beat
  "check out my app". Many groups have promo days.
- **Grok can hallucinate.** The prompt forbids inventing URLs and the
  verifier re-checks them, but always eyeball a group before spending time on
  it. Member counts are what a search snippet said, not live numbers.
- Search results reflect what Google/Bing indexed; private groups with
  little public footprint will show up with `url: null` or not at all.

## Adding / tuning bots

Edit `bots.ts`: add an entry to `BOTS` (id, name, persona, queries) or change
the queries. The system prompt (`DISCOVERY_SYSTEM_PROMPT`) carries the
product context and the fit-score rubric — tune it there if results skew
toward the wrong audience. `groups.test.ts` covers the merge/dedup/CSV logic:
`npx vitest run marketing/grok-bots`.
