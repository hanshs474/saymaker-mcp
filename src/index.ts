#!/usr/bin/env node
/**
 * saymaker-mcp — run SayMaker's image and video models from any MCP client.
 *
 * Every tool here goes through saymaker.ai's public API with the caller's own
 * API key, so a run costs the same credits, waits in the same queue and lands
 * in the same library as a run made on the site.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  BASE_URL,
  DEFAULT_ANON_IMAGE_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  findModel,
  modelsFor,
  type Media,
  type Scene,
} from './catalog.js';
import {
  credentialsHint,
  getTask,
  hasApiKey,
  mediaUrls,
  submit,
  SayMakerError,
  waitForTask,
  type Task,
} from './client.js';

const server = new McpServer({ name: 'saymaker-mcp', version: '0.1.0' });

const text = (body: string) => ({ content: [{ type: 'text' as const, text: body }] });
const fail = (body: string) => ({ ...text(body), isError: true as const });

function report(task: Task, label: string): string {
  const urls = mediaUrls(task);
  const cost = task.costCredits != null ? ` Cost: ${task.costCredits} credits.` : '';
  if (task.status === 'success' && urls.length) {
    return `${label} ready.${cost}\n\n${urls.join('\n')}\n\nTask id: ${task.id}`;
  }
  if (task.status === 'failed') {
    return `${label} failed. Task id: ${task.id}. Credits for a technical failure are refunded automatically.`;
  }
  if (task.status === 'success') {
    return `${label} finished but returned no media URL.${cost} Task id: ${task.id} — check https://saymaker.ai/history`;
  }
  return `${label} is still running (${task.status}).${cost} Poll it with get_task and this id: ${task.id}`;
}

async function run(
  media: Media,
  scene: Scene,
  modelId: string,
  prompt: string,
  options: Record<string, unknown>,
  wait: boolean,
  label: string
) {
  const model = findModel(modelId);
  if (!model) {
    return fail(`Unknown model "${modelId}". Call list_models to see what SayMaker runs.`);
  }
  if (!model.scenes.includes(scene)) {
    return fail(`${model.label} does not do ${scene}. Call list_models for models that do.`);
  }
  if (!hasApiKey() && !model.anon) {
    return fail(`${model.label} needs an API key. ${credentialsHint}`);
  }
  try {
    const task = await submit({
      provider: model.provider,
      model: model.id,
      media,
      scene,
      prompt,
      options,
    });
    if (!wait) return text(report(task, `${label} submitted`));
    const done = await waitForTask(task.id, { provider: model.provider, media });
    return text(report({ ...task, ...done }, label));
  } catch (e) {
    const message = e instanceof SayMakerError ? e.message : String(e);
    return fail(`${label} refused: ${message}`);
  }
}

server.registerTool(
  'list_models',
  {
    title: 'List SayMaker models',
    description:
      'The image and video models SayMaker runs (Veo 3.1, Kling 3.0, Seedance 2.0, Nano Banana 2, GPT Image 2.5, Seedream 5.0, Qwen Image 3, Wan 3.0 and more), with the input each one takes. Use the returned id with generate_image, edit_image or generate_video.',
    inputSchema: {
      media: z.enum(['image', 'video']).optional().describe('Only image models, or only video models.'),
    },
  },
  async ({ media }) => {
    const rows = modelsFor(media as Media | undefined).map(
      (m) =>
        `- \`${m.id}\` — ${m.label} (${m.media}; ${m.scenes.join(', ')})${
          m.anon ? ' — runs without an API key' : m.freeTier ? ' — runs on a free account' : ''
        }`
    );
    const auth = hasApiKey()
      ? 'An API key is set: every model above is available.'
      : `No API key set: only the models marked above can run. ${credentialsHint}`;
    return text(`SayMaker models (${rows.length}):\n\n${rows.join('\n')}\n\n${auth}`);
  }
);

server.registerTool(
  'generate_image',
  {
    title: 'Generate an image',
    description:
      'Generate an image from a text prompt on saymaker.ai and return its URL. Runs on your SayMaker credits and reports the exact credit cost. Name subject, framing, light and material in the prompt — vague prompts cost the same as precise ones.',
    inputSchema: {
      prompt: z.string().describe('What the image should show.'),
      model: z.string().optional().describe('Model id from list_models. Defaults to Nano Banana 2.'),
      aspect_ratio: z.string().optional().describe("e.g. '1:1', '16:9', '9:16', '4:3', '3:4'. Default '1:1'."),
      resolution: z
        .string()
        .optional()
        .describe("Output resolution where the model offers one: '1K', '2K' or '4K'. Bigger costs more credits."),
      wait: z.boolean().optional().describe('Wait for the result (default true). False returns a task id to poll.'),
    },
  },
  async ({ prompt, model, aspect_ratio, resolution, wait = true }) => {
    const id = model ?? (hasApiKey() ? DEFAULT_IMAGE_MODEL : DEFAULT_ANON_IMAGE_MODEL);
    // `size` carries the aspect ratio and `resolution` the pixel tier — the
    // site's own field names, kept as they are so one shape serves both.
    const options: Record<string, unknown> = {
      size: aspect_ratio ?? '1:1',
      resolution: resolution ?? '1K',
      n: 1,
    };
    return run('image', 'text-to-image', id, prompt, options, wait, 'Image');
  }
);

server.registerTool(
  'edit_image',
  {
    title: 'Edit an image',
    description:
      'Edit a photo you already have: change one thing and keep the rest. Pass the image URL and describe ONLY what should change, plus what must stay ("keep the face and background as they are") — that sentence is what decides whether the edit holds.',
    inputSchema: {
      image_url: z.string().describe('Public URL of the image to edit.'),
      prompt: z.string().describe('The change to make, and what must stay unchanged.'),
      model: z.string().optional().describe('Model id from list_models. Defaults to Nano Banana 2.'),
      wait: z.boolean().optional().describe('Wait for the result (default true).'),
    },
  },
  async ({ image_url, prompt, model, wait = true }) => {
    // 'auto' keeps the source framing, which is what an edit almost always wants.
    const options: Record<string, unknown> = {
      image_input: [image_url],
      size: 'auto',
      resolution: '1K',
      n: 1,
    };
    return run('image', 'image-to-image', model ?? DEFAULT_IMAGE_MODEL, prompt, options, wait, 'Edit');
  }
);

server.registerTool(
  'generate_video',
  {
    title: 'Generate a video',
    description:
      'Generate a video clip from a prompt, or animate a still by passing image_url. Runs Veo 3.1, Kling 3.0, Seedance 2.0 and the rest of the SayMaker shelf on your own credits; many of them return sound in the same pass. Needs an API key. On a free account, pass model minimax-h3-fast (480p or 768p, 4 to 15 seconds).',
    inputSchema: {
      prompt: z.string().describe('The shot: what happens, where, how the camera moves.'),
      image_url: z.string().optional().describe('Optional first frame — makes this image-to-video.'),
      model: z.string().optional().describe('Model id from list_models. Defaults to Seedance 2.0.'),
      duration: z.number().optional().describe('Clip length in seconds where the model offers a choice, e.g. 4, 6, 8, 10 (MiniMax H3 Fast also 15).'),
      resolution: z.string().optional().describe("e.g. '480p', '720p', '1080p', '4k' ('480p' or '768p' on MiniMax H3 Fast)."),
      aspect_ratio: z.string().optional().describe("e.g. '16:9', '9:16'. Default '16:9'."),
      sound: z.boolean().optional().describe('Ask for sound where the model writes it in the same pass (default true).'),
      wait: z.boolean().optional().describe('Wait for the result (default false — video takes minutes).'),
    },
  },
  async ({ prompt, image_url, model, duration, resolution, aspect_ratio, sound = true, wait = false }) => {
    const options: Record<string, unknown> = {
      aspect_ratio: aspect_ratio ?? '16:9',
      sound,
    };
    if (image_url) options.image_input = [image_url];
    if (duration) options.duration = duration;
    if (resolution) options.resolution = resolution;
    return run(
      'video',
      image_url ? 'image-to-video' : 'text-to-video',
      model ?? DEFAULT_VIDEO_MODEL,
      prompt,
      options,
      wait,
      'Video'
    );
  }
);

server.registerTool(
  'get_task',
  {
    title: 'Check a SayMaker run',
    description: 'Poll a run submitted earlier and return its status and media URL when it is ready.',
    inputSchema: {
      task_id: z.string().describe('The task id returned by generate_image, edit_image or generate_video.'),
      wait: z.boolean().optional().describe('Keep polling until it finishes (default false).'),
    },
  },
  async ({ task_id, wait = false }) => {
    try {
      const task = wait ? await waitForTask(task_id) : await getTask(task_id);

      return text(report(task, 'Run'));
    } catch (e) {
      const message = e instanceof SayMakerError ? e.message : String(e);
      return fail(`Could not read task ${task_id}: ${message}`);
    }
  }
);

server.registerTool(
  'open_in_saymaker',
  {
    title: 'Open SayMaker in a browser',
    description:
      'The URL to carry on in the browser: the agent that plans multi-step jobs from one sentence, a specific model page, or the image or video maker.',
    inputSchema: {
      target: z
        .enum(['agent', 'image', 'video', 'pricing', 'model'])
        .optional()
        .describe("Defaults to 'agent'."),
      model: z.string().optional().describe("Model id, when target is 'model'."),
    },
  },
  async ({ target = 'agent', model }) => {
    if (target === 'model') {
      const m = model ? findModel(model) : undefined;
      if (!m) return fail('Pass a model id from list_models to open its page.');
      if (!m.page) {
        return text(`${m.label} has no page of its own — run it from ${BASE_URL}/${m.media}`);
      }
      return text(`${BASE_URL}/${m.media}/${m.page}`);
    }
    return text(`${BASE_URL}/${target === 'agent' ? 'agent' : target}`);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
