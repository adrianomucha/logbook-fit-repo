/**
 * Grok group-finder bots — CLI.
 *
 *   npm run grok-bots -- --list
 *   npm run grok-bots -- --all                      # every bot, nationwide
 *   npm run grok-bots -- --bot pt-independent --regions 5
 *   npm run grok-bots -- --all --verify             # discover, then verify URLs
 *   npm run grok-bots -- --verify                   # only verify what's unverified
 *   npm run grok-bots -- --all --dry-run            # print the prompts, no API calls
 *
 * Results accumulate in marketing/grok-bots/out/groups.{json,csv}. Runs are
 * idempotent: a (bot, query, region) combo that already ran is skipped unless
 * --force. Raw API responses go to out/raw/ (gitignored) for debugging.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { BOTS, US_REGIONS, DISCOVERY_SYSTEM_PROMPT, VERIFY_SYSTEM_PROMPT, buildDiscoveryUserPrompt, buildVerifyUserPrompt, getBot, type BotDefinition } from "./bots";
import { grok, DEFAULT_MODEL, type GrokResult } from "./xai";
import { applyVerifications, mergeSightings, parseCandidates, parseVerifications, toCsv, type GroupRecord, type Sighting } from "./groups";

const OUT_DIR = path.join(__dirname, "out");
const RAW_DIR = path.join(OUT_DIR, "raw");
const GROUPS_JSON = path.join(OUT_DIR, "groups.json");
const GROUPS_CSV = path.join(OUT_DIR, "groups.csv");
const STATE_JSON = path.join(OUT_DIR, "state.json");

interface Options {
  bots: BotDefinition[];
  regions: string[];
  limit: number;
  verify: boolean;
  verifyOnly: boolean;
  dryRun: boolean;
  force: boolean;
  concurrency: number;
  model: string;
  reasoningEffort?: "low" | "medium" | "high";
  xSearch: boolean;
}

interface State {
  /** "bot|query|region" → ISO timestamp of the completed run */
  done: Record<string, string>;
}

function usage(): never {
  console.log(`Usage: npm run grok-bots -- [options]

  --list                 List bots and exit
  --bot <id>             Run this bot (repeatable, or comma-separated)
  --all                  Run every bot
  --regions <n>          Also run each query for the first n US regions (default 0 = nationwide only)
  --region "<name>"      Run for a specific region (repeatable); overrides --regions
  --limit <n>            Max groups per query (default 15)
  --verify               After discovery, verify every unverified group URL
  --dry-run              Print prompts, make no API calls
  --force                Re-run (bot, query, region) combos already in out/state.json
  --concurrency <n>      Parallel Grok calls (default 2)
  --model <id>           xAI model (default $GROK_MODEL or ${DEFAULT_MODEL})
  --reasoning <effort>   low | medium | high (default: model default)
  --no-x-search          Web search only (default: web_search + x_search)

Bots: ${BOTS.map((b) => b.id).join(", ")}`);
  process.exit(0);
}

function parseArgs(argv: string[]): Options {
  const botIds: string[] = [];
  const explicitRegions: string[] = [];
  let all = false;
  let regionCount = 0;
  const o: Options = {
    bots: [],
    regions: [],
    limit: 15,
    verify: false,
    verifyOnly: false,
    dryRun: false,
    force: false,
    concurrency: 2,
    model: process.env.GROK_MODEL || DEFAULT_MODEL,
    reasoningEffort: (process.env.GROK_REASONING_EFFORT as Options["reasoningEffort"]) || undefined,
    xSearch: true,
  };
  const next = (i: number, flag: string) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--help":
      case "-h":
        usage();
      // eslint-disable-next-line no-fallthrough
      case "--list":
        console.log(BOTS.map((b) => `${b.id.padEnd(20)} ${b.name} (${b.queries.length} queries)`).join("\n"));
        process.exit(0);
      // eslint-disable-next-line no-fallthrough
      case "--bot":
        botIds.push(...next(i++, a).split(",").map((s) => s.trim()).filter(Boolean));
        break;
      case "--all":
        all = true;
        break;
      case "--regions":
        regionCount = Number(next(i++, a));
        break;
      case "--region":
        explicitRegions.push(next(i++, a));
        break;
      case "--limit":
        o.limit = Number(next(i++, a));
        break;
      case "--verify":
        o.verify = true;
        break;
      case "--dry-run":
        o.dryRun = true;
        break;
      case "--force":
        o.force = true;
        break;
      case "--concurrency":
        o.concurrency = Math.max(1, Number(next(i++, a)));
        break;
      case "--model":
        o.model = next(i++, a);
        break;
      case "--reasoning":
        o.reasoningEffort = next(i++, a) as Options["reasoningEffort"];
        break;
      case "--no-x-search":
        o.xSearch = false;
        break;
      default:
        throw new Error(`Unknown argument ${a} (try --help)`);
    }
  }
  o.bots = all ? BOTS : botIds.map(getBot);
  o.regions = explicitRegions.length ? explicitRegions : US_REGIONS.slice(0, Math.max(0, regionCount));
  o.verifyOnly = o.verify && o.bots.length === 0;
  if (!o.bots.length && !o.verify) {
    console.error("Nothing to do: pass --bot <id>, --all, or --verify (see --help).");
    process.exit(1);
  }
  if (!Number.isFinite(o.limit) || o.limit < 1) throw new Error("--limit must be a positive number");
  return o;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeOutputs(groups: GroupRecord[]) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(GROUPS_JSON, JSON.stringify(groups, null, 2) + "\n");
  fs.writeFileSync(GROUPS_CSV, toCsv(groups));
}

function saveRaw(name: string, res: GrokResult) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(RAW_DIR, `${stamp}-${name.replace(/[^a-z0-9-]+/gi, "_").slice(0, 80)}.json`);
  fs.writeFileSync(file, JSON.stringify({ text: res.text, citations: res.citations, usage: res.usage, cost_usd: res.costUsd, raw: res.raw }, null, 2));
}

async function pool<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

interface Task {
  bot: BotDefinition;
  query: string;
  region: string | null;
  key: string;
}

const totals = { calls: 0, input: 0, output: 0, cost: 0, costKnown: false };
function track(res: GrokResult) {
  totals.calls++;
  if (res.usage) {
    totals.input += res.usage.input;
    totals.output += res.usage.output;
  }
  if (typeof res.costUsd === "number") {
    totals.cost += res.costUsd;
    totals.costKnown = true;
  }
}

async function discover(o: Options, groups: GroupRecord[], state: State): Promise<GroupRecord[]> {
  const tasks: Task[] = [];
  for (const bot of o.bots) {
    for (const query of bot.queries) {
      for (const region of [null, ...o.regions]) {
        const key = `${bot.id}|${query}|${region ?? "US"}`;
        if (!o.force && state.done[key]) continue;
        tasks.push({ bot, query, region, key });
      }
    }
  }
  const skipped = o.bots.reduce((n, b) => n + b.queries.length * (1 + o.regions.length), 0) - tasks.length;
  console.log(`Discovery: ${tasks.length} research call(s)${skipped ? `, ${skipped} already done (use --force to redo)` : ""}, model ${o.model}.`);
  if (!tasks.length) return groups;

  if (o.dryRun) {
    for (const t of tasks) {
      console.log(`\n=== ${t.key} ===\n${buildDiscoveryUserPrompt(t.bot, t.query, t.region, o.limit)}`);
    }
    console.log(`\n--- system prompt (${DISCOVERY_SYSTEM_PROMPT.length} chars) ---\n${DISCOVERY_SYSTEM_PROMPT}`);
    return groups;
  }

  const tools = o.xSearch ? [{ type: "web_search" as const }, { type: "x_search" as const }] : [{ type: "web_search" as const }];
  let current = groups;
  await pool(tasks, o.concurrency, async (t, idx) => {
    const label = `[${idx + 1}/${tasks.length}] ${t.bot.id} · ${t.region ?? "US"} · ${t.query.slice(0, 60)}…`;
    console.log(`→ ${label}`);
    try {
      const res = await grok({
        model: o.model,
        system: DISCOVERY_SYSTEM_PROMPT,
        user: buildDiscoveryUserPrompt(t.bot, t.query, t.region, o.limit),
        tools,
        reasoningEffort: o.reasoningEffort,
      });
      track(res);
      saveRaw(`${t.bot.id}-${t.region ?? "US"}`, res);
      const { candidates, dropped } = parseCandidates(res.text);
      const sightings: Sighting[] = candidates.map((candidate) => ({ candidate, bot: t.bot.id, query: t.query, citations: [] }));
      const before = current.length;
      current = mergeSightings(current, sightings, new Date().toISOString());
      state.done[t.key] = new Date().toISOString();
      writeOutputs(current);
      fs.writeFileSync(STATE_JSON, JSON.stringify(state, null, 2) + "\n");
      console.log(`✓ ${label}\n    ${candidates.length} groups (${current.length - before} new${dropped ? `, ${dropped} malformed rows dropped` : ""})${res.usage ? ` · ${res.usage.input}+${res.usage.output} tokens` : ""}`);
      if (!candidates.length) console.log(`    (empty result — see out/raw/ for the model's text)`);
    } catch (e) {
      console.error(`✗ ${label}\n    ${e instanceof Error ? e.message : e}`);
    }
  });
  return current;
}

async function verify(o: Options, groups: GroupRecord[]): Promise<GroupRecord[]> {
  const pending = groups.filter((g) => g.url && (g.verified === null || o.force));
  console.log(`\nVerification: ${pending.length} group URL(s) to check.`);
  if (!pending.length) return groups;
  if (o.dryRun) {
    console.log(buildVerifyUserPrompt(pending.slice(0, 5).map((g) => ({ name: g.name, url: g.url! }))));
    return groups;
  }
  const BATCH = 5;
  const batches: GroupRecord[][] = [];
  for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));
  let current = groups;
  await pool(batches, o.concurrency, async (batch, idx) => {
    const label = `[verify ${idx + 1}/${batches.length}]`;
    try {
      const res = await grok({
        model: o.model,
        system: VERIFY_SYSTEM_PROMPT,
        user: buildVerifyUserPrompt(batch.map((g) => ({ name: g.name, url: g.url! }))),
        tools: [{ type: "web_search" }],
        reasoningEffort: o.reasoningEffort,
      });
      track(res);
      saveRaw(`verify-${idx + 1}`, res);
      const verdicts = parseVerifications(res.text);
      current = applyVerifications(current, verdicts, new Date().toISOString());
      writeOutputs(current);
      const ok = verdicts.filter((v) => v.exists).length;
      console.log(`✓ ${label} ${verdicts.length}/${batch.length} answered, ${ok} confirmed`);
    } catch (e) {
      console.error(`✗ ${label} ${e instanceof Error ? e.message : e}`);
    }
  });
  return current;
}

function printSummary(groups: GroupRecord[]) {
  const top = groups.filter((g) => g.verified !== false).slice(0, 20);
  console.log(`\n${groups.length} unique group(s) in out/groups.json · ${groups.filter((g) => g.verified === true).length} verified · ${groups.filter((g) => g.verified === false).length} rejected`);
  if (top.length) {
    console.log("\nTop leads:");
    for (const g of top) {
      const members = g.members_estimate ? `${(g.members_estimate / 1000).toFixed(g.members_estimate >= 10_000 ? 0 : 1)}k` : "?";
      const v = g.verified === true ? "✔" : " ";
      console.log(`  ${v} ${g.fit_score}/5  ${members.padStart(6)}  ${g.name.slice(0, 48).padEnd(48)}  ${g.url ?? "(no url yet)"}`);
    }
  }
  if (totals.calls) {
    const cost = totals.costKnown ? ` · $${totals.cost.toFixed(3)}` : "";
    console.log(`\n${totals.calls} Grok call(s) · ${totals.input.toLocaleString()} in / ${totals.output.toLocaleString()} out tokens${cost}`);
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const state = readJson<State>(STATE_JSON, { done: {} });
  let groups = readJson<GroupRecord[]>(GROUPS_JSON, []);
  if (!o.dryRun) getApiKeyOrExit();
  if (!o.verifyOnly) groups = await discover(o, groups, state);
  if (o.verify) groups = await verify(o, groups);
  if (!o.dryRun) {
    writeOutputs(groups);
    printSummary(groups);
  }
}

function getApiKeyOrExit() {
  if (!process.env.XAI_API_KEY) {
    console.error("XAI_API_KEY is not set. Get one at https://console.x.ai and add it to .env (see .env.example). Use --dry-run to preview prompts without a key.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
