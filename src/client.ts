/**
 * The whole of what this server needs from saymaker.ai: submit a run, poll it.
 * Zero dependencies — plain fetch against the same two endpoints the website
 * uses, so an MCP run is priced and queued exactly like a run on the site.
 */
import { BASE_URL as SITE_URL } from './catalog.js';

/** Overridable for testing against a local build of the site; never needed in use. */
const BASE_URL = process.env.SAYMAKER_BASE_URL?.replace(/\/$/, '') || SITE_URL;

export type Scene =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video';

export type SubmitInput = {
  provider: string;
  model: string;
  media: 'image' | 'video';
  scene: Scene;
  prompt: string;
  options?: Record<string, unknown>;
};

export type Task = {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | string;
  costCredits?: number;
  taskResult?: unknown;
  urls?: string[];
  /** Anonymous runs wait in the free queue; seconds, when the API reports it. */
  queueEta?: number;
  images?: string[];
  videos?: string[];
  /** Carried from the submit call so polling knows which endpoint to use. */
  provider?: string;
  media?: 'image' | 'video';
};

/** `x-anon-id` is client-generated and unverified: it is the key to a free
 *  browser-sized wallet, not an identity. One per process is what a signed-out
 *  visitor looks like; minting a fresh one per call to farm the grant is what
 *  the per-IP daily ceiling is there to stop, so we do not do it. */
const ANON_ID = `mcp-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export class SayMakerError extends Error {}

export const credentialsHint =
  'Set SAYMAKER_API_KEY to run any model on your own credits — create a key at https://saymaker.ai/settings/apikeys. Without one this server runs on the signed-out free wallet, which covers one text-to-image run.';

function authHeaders(): Record<string, string> {
  const key = process.env.SAYMAKER_API_KEY?.trim();
  return key ? { authorization: `Bearer ${key}` } : { 'x-anon-id': ANON_ID };
}

export function hasApiKey(): boolean {
  return Boolean(process.env.SAYMAKER_API_KEY?.trim());
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SayMakerError(`saymaker.ai returned non-JSON (${res.status})`);
  }
  // The API answers HTTP 200 with `code: -1` for refusals (no credits, invalid
  // key, blocked prompt). Reading the status code alone reports success.
  if (json.code !== 0) {
    throw new SayMakerError(json.message || `request failed (${res.status})`);
  }
  return json.data;
}

export async function submit(input: SubmitInput): Promise<Task> {
  const data = await post('/api/ai/generate', {
    provider: input.provider,
    mediaType: input.media,
    model: input.model,
    scene: input.scene,
    prompt: input.prompt,
    options: input.options ?? {},
  });
  // A refusal that arrives shaped like a success: HTTP 200, `code: 0`, and a
  // `wall` flag instead of a task. Reading only `code` hands back an object with
  // no id, and the confusing error surfaces one step later, on the poll.
  const wall = data as { wall?: boolean; reason?: string; cost?: number };
  if (wall?.wall) {
    const why =
      wall.reason === 'anon_ip_daily'
        ? "this machine has used up today's free anonymous credits"
        : 'the free anonymous wallet is out of credits';
    throw new SayMakerError(`${why} (this run needs ${wall.cost ?? '?'}). ${credentialsHint}`);
  }
  return { ...(data as Task), provider: input.provider, media: input.media };
}

/**
 * Two endpoints, one for each identity. A signed-out run polled on
 * `/api/ai/query` comes back "no auth, please sign in" — the run itself was
 * accepted and charged, so the failure looks like a broken server rather than
 * the wrong door. Which one to knock on follows from whether a key is set.
 */
export async function getTask(
  taskId: string,
  ctx: { provider?: string; media?: 'image' | 'video' } = {}
): Promise<Task> {
  if (hasApiKey()) {
    const data = await post('/api/ai/query', { taskId });
    return data as Task;
  }
  const qs = new URLSearchParams({
    taskId,
    provider: ctx.provider ?? 'kie',
    mediaType: ctx.media ?? 'image',
  });
  const res = await fetch(`${BASE_URL}/api/ai/anon-query?${qs}`, {
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => null);
  if (!json || json.code !== 0) {
    throw new SayMakerError(json?.message || `poll failed (${res.status})`);
  }
  // `id` last: the anon poll answers with status and media but no row id, and
  // the id is what the caller polls with next.
  return { ...(json.data as Task), id: taskId };
}

/** Media URLs live in `taskResult`, whose shape varies by provider. */
export function mediaUrls(task: Task): string[] {
  const seen = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      if (/^https?:\/\/\S+\.(png|jpe?g|webp|gif|mp4|webm|mov)(\?|$)/i.test(v)) seen.add(v);
      return;
    }
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') return Object.values(v).forEach(walk);
  };
  let result: unknown = task.taskResult;
  if (typeof result === 'string') {
    try {
      result = JSON.parse(result);
    } catch {
      /* a bare URL string walks fine below */
    }
  }
  walk(result);
  walk(task.urls);
  walk(task.images);
  walk(task.videos);
  return [...seen];
}

export async function waitForTask(
  taskId: string,
  ctx: { provider?: string; media?: 'image' | 'video' } = {},
  { timeoutMs = 300_000, intervalMs = 5_000 } = {}
): Promise<Task> {
  const deadline = Date.now() + timeoutMs;
  let task = await getTask(taskId, ctx);
  while (task.status === 'pending' || task.status === 'processing') {
    if (Date.now() > deadline) return task;
    await new Promise((r) => setTimeout(r, intervalMs));
    task = await getTask(taskId, ctx);
  }
  return { ...task, id: taskId };
}

