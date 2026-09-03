/**
 * Minimal client for the xAI Responses API with Grok's server-side search
 * tools. No SDK dependency: one POST to /v1/responses per research task,
 * Grok runs the web/X searches itself and returns text + citations.
 *
 * Docs: https://docs.x.ai/developers/tools/web-search
 */

export type XaiTool = { type: "web_search" } | { type: "x_search" };

export interface GrokRequest {
  model: string;
  system: string;
  user: string;
  tools?: XaiTool[];
  /** Only sent when set; leave undefined for the model default. */
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface GrokResult {
  text: string;
  citations: string[];
  usage: { input: number; output: number } | null;
  costUsd: number | null;
  raw: unknown;
}

export const DEFAULT_MODEL = "grok-4.5";

const BASE_URL = (process.env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/$/, "");

export class XaiError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: string) {
    super(message);
    this.name = "XaiError";
  }
}

export function getApiKey(): string {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new XaiError(
      "XAI_API_KEY is not set. Create a key at https://console.x.ai and add it to .env (see .env.example).",
    );
  }
  return key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function grok(req: GrokRequest): Promise<GrokResult> {
  const apiKey = getApiKey();
  const attempts = req.maxAttempts ?? 3;
  const body: Record<string, unknown> = {
    model: req.model,
    input: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    tools: req.tools ?? [{ type: "web_search" }],
  };
  if (req.reasoningEffort) body.reasoning = { effort: req.reasoningEffort };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 240_000);
    try {
      const res = await fetch(`${BASE_URL}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      if (res.ok) {
        const raw = JSON.parse(text);
        return {
          text: extractText(raw),
          citations: extractCitations(raw),
          usage: extractUsage(raw),
          costUsd: typeof raw?.cost_usd === "number" ? raw.cost_usd : null,
          raw,
        };
      }
      const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
      const err = new XaiError(`xAI ${res.status}: ${text.slice(0, 500)}`, res.status, text);
      if (!retryable || attempt === attempts) throw err;
      lastErr = err;
    } catch (e) {
      if (e instanceof XaiError) throw e;
      // Network error / abort: retry.
      lastErr = e;
      if (attempt === attempts) break;
    } finally {
      clearTimeout(timer);
    }
    await sleep(2_000 * 2 ** (attempt - 1));
  }
  throw lastErr instanceof Error ? lastErr : new XaiError(String(lastErr));
}

/** Text lives in `output_text` (convenience) or in message items under `output[]`. */
export function extractText(raw: any): string {
  if (typeof raw?.output_text === "string" && raw.output_text.trim()) return raw.output_text;
  const parts: string[] = [];
  for (const item of raw?.output ?? []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const c of item.content) if (typeof c?.text === "string") parts.push(c.text);
  }
  return parts.join("\n");
}

/** Citations: top-level `citations` (strings or {url}) plus any url_citation annotations. */
export function extractCitations(raw: any): string[] {
  const urls = new Set<string>();
  for (const c of raw?.citations ?? []) {
    if (typeof c === "string") urls.add(c);
    else if (typeof c?.url === "string") urls.add(c.url);
  }
  for (const item of raw?.output ?? []) {
    for (const c of item?.content ?? []) {
      for (const a of c?.annotations ?? []) if (typeof a?.url === "string") urls.add(a.url);
    }
  }
  return [...urls];
}

function extractUsage(raw: any): GrokResult["usage"] {
  const u = raw?.usage;
  if (!u) return null;
  const input = u.input_tokens ?? u.prompt_tokens;
  const output = u.output_tokens ?? u.completion_tokens;
  if (typeof input !== "number" || typeof output !== "number") return null;
  return { input, output };
}
