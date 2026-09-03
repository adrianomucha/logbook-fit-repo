/**
 * Bot definitions. Each bot is one persona hunting one slice of the
 * Logbook.fit ICP. A "run" of a bot = one Grok research call per
 * (query × region), each returning up to N groups as JSON.
 *
 * Add a bot: append to BOTS. Tweak targeting: edit its queries.
 */

export interface BotDefinition {
  id: string;
  name: string;
  /** Who this bot is looking for — goes into the prompt verbatim. */
  persona: string;
  /** Natural-language research tasks. Each becomes its own Grok call. */
  queries: string[];
}

/** Shared product context every bot gets. Keep it honest — Grok uses it to judge fit. */
export const PRODUCT_CONTEXT = `Logbook.fit is a retention-first coaching platform for INDEPENDENT fitness coaches — personal trainers, online coaches, strength & conditioning coaches, and nutrition coaches who also program training — who manage their own roster of paying clients. It ranks a coach's clients by who needs attention today (going quiet, check-in due, awaiting a reply), runs a structured weekly check-in loop, and includes a workout plan builder and exercise library. It replaces the spreadsheet + WhatsApp mess. It is NOT for solo lifters, gym members, or people looking for a trainer.`;

export const BOTS: BotDefinition[] = [
  {
    id: "pt-independent",
    name: "Independent personal trainers",
    persona:
      "Independent / freelance personal trainers in the US who run their own client roster (in-gym, in-home or hybrid) and talk about the business side: client retention, scheduling, pricing, check-ins, keeping clients accountable.",
    queries: [
      "Facebook groups for independent personal trainers running their own training business",
      "Facebook groups where personal trainers discuss client retention, client management and growing their client base",
      "Facebook groups for certified personal trainers (NASM, ACE, ISSA, NSCA) focused on the business of training, not workouts",
      "Personal trainer business mastermind / networking Facebook groups",
    ],
  },
  {
    id: "online-coaching",
    name: "Online fitness coaches",
    persona:
      "Online fitness coaches in the US who coach clients remotely (programming + check-ins over apps/WhatsApp/email) and talk about scaling, client check-ins, churn, and coaching software.",
    queries: [
      "Facebook groups for online fitness coaches and online personal trainers building a remote coaching business",
      "Facebook groups where online coaches discuss client check-ins, coaching apps, client churn and retention",
      "Facebook groups for fitness coaches transitioning from in-person to online coaching",
      "Facebook groups for hybrid fitness coaches (in-person + online clients)",
    ],
  },
  {
    id: "strength-coaches",
    name: "Strength & conditioning / barbell coaches",
    persona:
      "Strength and conditioning coaches, powerlifting coaches, Olympic weightlifting coaches and CrossFit-style coaches in the US who write programs for athletes and clients and run weekly check-ins.",
    queries: [
      "Facebook groups for strength and conditioning coaches who program for private clients and athletes",
      "Facebook groups for powerlifting coaches and weightlifting coaches who coach clients remotely",
      "Facebook groups for CrossFit coaches and affiliate coaches discussing coaching individual clients and programming",
      "Facebook groups for strength coaches discussing coaching business, client programming software and check-ins",
    ],
  },
  {
    id: "nutrition-hybrid",
    name: "Nutrition & health coaches who program training",
    persona:
      "Nutrition coaches and health coaches in the US who also write training plans for clients (body recomposition, fat loss, lifestyle coaching) and run structured client check-ins.",
    queries: [
      "Facebook groups for nutrition coaches who also coach training and run weekly client check-ins",
      "Facebook groups for certified nutrition coaches (Precision Nutrition, NASM CNC, ISSA) discussing coaching business and client management",
      "Facebook groups for health and wellness coaches with paying 1:1 clients discussing client accountability and retention",
    ],
  },
  {
    id: "gym-studio-owners",
    name: "Small gym & studio owners",
    persona:
      "Owners of small independent gyms, private training studios and boutique fitness studios in the US who personally coach clients and/or employ a few trainers, and care about member/client retention.",
    queries: [
      "Facebook groups for independent gym owners and private training studio owners",
      "Facebook groups for boutique fitness studio owners discussing member retention and client management",
      "Facebook groups for semi-private training and small group personal training business owners",
    ],
  },
];

/**
 * Region rotation: `--regions N` runs each query nationwide plus for the
 * first N entries here. Metros first (denser coach communities), then states.
 */
export const US_REGIONS: string[] = [
  "New York City, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Dallas–Fort Worth, TX",
  "Phoenix / Scottsdale, AZ",
  "Miami / South Florida, FL",
  "Atlanta, GA",
  "Denver, CO",
  "Seattle, WA",
  "Austin, TX",
  "San Diego, CA",
  "Boston, MA",
  "Philadelphia, PA",
  "Tampa / Orlando, FL",
  "Nashville, TN",
  "Charlotte / Raleigh, NC",
  "Las Vegas, NV",
  "Minneapolis, MN",
  "Portland, OR",
  "San Francisco Bay Area, CA",
  "Washington, DC / Northern Virginia",
  "Salt Lake City, UT",
  "Texas",
  "Florida",
  "California",
  "New York",
  "Georgia",
  "Arizona",
  "Colorado",
  "North Carolina",
  "Ohio",
  "Pennsylvania",
  "Illinois",
  "Michigan",
  "Tennessee",
  "Washington",
  "Utah",
  "New Jersey",
  "Massachusetts",
  "Virginia",
];

export function getBot(id: string): BotDefinition {
  const bot = BOTS.find((b) => b.id === id);
  if (!bot) {
    throw new Error(`Unknown bot "${id}". Available: ${BOTS.map((b) => b.id).join(", ")}`);
  }
  return bot;
}

export const DISCOVERY_SYSTEM_PROMPT = `You are a marketing research bot for Logbook.fit.

${PRODUCT_CONTEXT}

Your job: find Facebook GROUPS (URLs of the form facebook.com/groups/<slug-or-id>) based in the United States, or with a mostly-US membership, where the coaches described by the user gather to talk about their coaching business, client management, programming, or growing their practice. These groups are where Logbook.fit's future users already hang out.

How to search:
- Use web search (and X search when useful). Public group pages are indexed as "facebook.com/groups/<slug>" and search snippets usually show the member count and a one-line description. Blog roundups ("best Facebook groups for personal trainers"), directories, Reddit threads, podcast show notes and coach forums also list groups.
- Try several phrasings and look past the first page. Aim for real, specific groups, not generic guesses.

Hard rules:
- NEVER invent or guess a URL. If you found a group's name but not its facebook.com/groups URL, set "url": null and explain in "fit_rationale" where you saw it.
- Only include groups whose members are coaches / trainers / gym owners. Skip groups for general fitness enthusiasts, weight-loss challenges, workout buddies, or people looking FOR a trainer — unless coaches are clearly the main audience.
- US only. National US groups count. Groups for a US state or metro count. Groups for other countries (UK, Australia, Canada-only, India...) do not. "Worldwide" groups count only when the US is clearly the dominant audience.
- Prefer active groups (recent posts, growing membership). Skip groups that look dead, spam-only, or are actually a business page rather than a group.
- Deduplicate: one row per group.

Output: respond with ONLY a JSON array — no prose, no markdown fences. Each item exactly:
{
  "name": string,
  "url": string | null,
  "privacy": "public" | "private" | "unknown",
  "members_estimate": integer | null,
  "region": string,            // "US (nationwide)", "Texas", "Los Angeles, CA", ...
  "audience": string,          // who is actually in there, one line
  "fit_score": 1 | 2 | 3 | 4 | 5,
  "fit_rationale": string,     // one or two sentences
  "promo_policy": string | null,   // what the rules say about self-promotion, if visible ("no promo", "promo Fridays", "value-first posts ok")
  "activity_signal": string | null, // e.g. "10+ posts/day per snippet", "last post 2024"
  "sources": string[],         // URLs where you found this group mentioned
  "confidence": "high" | "medium" | "low"
}

fit_score guide: 5 = independent coaches running their own paying client roster, discussing client management / retention / business; 4 = coaches, broader topics (programming, certs, general shop talk); 3 = mixed coaches and enthusiasts; 2 = mostly enthusiasts with a few coaches; 1 = poor fit.`;

export function buildDiscoveryUserPrompt(bot: BotDefinition, query: string, region: string | null, limit: number): string {
  const scope = region ? `Geographic focus: ${region} (groups for this area, plus national groups that are especially popular there).` : "Geographic focus: US nationwide.";
  return [
    `Bot persona — who we are looking for: ${bot.persona}`,
    "",
    `Research task: ${query}.`,
    scope,
    "",
    `Return up to ${limit} groups, best fit first. JSON array only.`,
  ].join("\n");
}

export const VERIFY_SYSTEM_PROMPT = `You verify Facebook group leads for a fitness-coaching software company. For each group URL you are given, use web search to check that the group actually exists at that URL, and pull what is visible publicly: current name, member count, public/private, whether it's US-based, who the members are, any visible rules about self-promotion, and how active it looks.

Rules:
- Do not guess. If you cannot confirm the group exists, set "exists": false and say why in "notes".
- If the URL redirects to or is clearly the same as another group URL, report the URL you were given in "url" and mention the canonical one in "notes".
- Output ONLY a JSON array, no prose, no markdown fences. One item per input URL, exactly:
{
  "url": string,                    // the URL you were given, unchanged
  "exists": boolean,
  "name": string | null,
  "members_estimate": integer | null,
  "privacy": "public" | "private" | "unknown",
  "us_based": boolean | null,
  "audience": string | null,
  "promo_policy": string | null,
  "activity_signal": string | null,
  "notes": string,
  "sources": string[]
}`;

export function buildVerifyUserPrompt(groups: { name: string; url: string }[]): string {
  const list = groups.map((g, i) => `${i + 1}. ${g.url}  (we think it's called "${g.name}")`).join("\n");
  return `Verify these Facebook groups:\n\n${list}\n\nJSON array only, one item per URL, same order.`;
}
