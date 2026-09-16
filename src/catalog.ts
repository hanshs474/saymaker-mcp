/**
 * The model shelf, mirrored from saymaker.ai's own picker
 * (`src/config/generator-models.ts` in the site repo) on 2026-09-16.
 *
 * `provider` is the runtime routing field the API requires in the body. It is
 * deliberately never printed in a tool result: it is an internal mapping, not
 * something a caller should learn or depend on.
 */
export const BASE_URL = 'https://saymaker.ai';

export type Media = 'image' | 'video';
export type Scene =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'image-to-video';

export type Model = {
  id: string;
  label: string;
  media: Media;
  scenes: Scene[];
  provider: string;
  /** Runnable without an API key, on the anonymous free wallet. */
  anon?: boolean;
  /** Runnable on a free account's key; every other video model needs a plan or credit pack. */
  freeTier?: boolean;
  /**
   * Slug of this model's page on saymaker.ai, where it has one. Not every model
   * in the picker has a page, and several share one (both GPT Image 2.5 tiers),
   * so this is a lookup, not a formatting rule — guessing `/image/<id>` 404s.
   */
  page?: string;
};

export const MODELS: Model[] = [
  { id: 'saymaker-image-v1', label: 'SayMaker Image v1', media: 'image', scenes: ['text-to-image'], provider: 'kie', anon: true },
  { id: 'nano-banana-2-lite', label: 'Nano Banana 2 Lite', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'kie', page: 'nano-banana-2-lite', anon: true },
  { id: 'nano-banana-2', label: 'Nano Banana 2', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'poyo', page: 'nano-banana-2' },
  { id: 'nano-banana-pro', label: 'Nano Banana Pro', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'poyo' },
  { id: 'gpt-image-2', label: 'GPT Image 2', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'poyo' },
  { id: 'gpt-image-2-5-flare', label: 'GPT Image 2.5 Flare', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'kie', page: 'gpt-image-2-5' },
  { id: 'gpt-image-2-5-sunburst', label: 'GPT Image 2.5 Sunburst', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'kie', page: 'gpt-image-2-5' },
  { id: 'seedream-5-lite', label: 'Seedream 5.0 Lite', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'poyo', page: 'seedream-5-lite' },
  { id: 'seedream-5-pro', label: 'Seedream 5.0 Pro', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'kie', page: 'seedream-5-pro' },
  { id: 'seedream-4-5', label: 'Seedream 4.5', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'kie' },
  { id: 'seedream-4', label: 'Seedream 4.0', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'poyo' },
  { id: 'qwen-image-3-pro', label: 'Qwen Image 3.0 Pro', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'kie', page: 'qwen-image-3' },
  { id: 'grok-imagine-image-2-0', label: 'Grok Imagine Image 2.0', media: 'image', scenes: ['text-to-image', 'image-to-image'], provider: 'poyo', page: 'grok-imagine-image-2-0' },
  { id: 'veo-3-1', label: 'Veo 3.1', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'veo-3-1' },
  { id: 'kling-3-0', label: 'Kling 3.0', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'kling-3-0' },
  { id: 'kling-3-0-turbo', label: 'Kling 3.0 Turbo', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'kling-3-0-turbo' },
  { id: 'kling-2-6', label: 'Kling 2.6', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie' },
  { id: 'seedance-2-5', label: 'Seedance 2.5', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'seedance-2-5' },
  { id: 'seedance-2', label: 'Seedance 2.0', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'seedance-2' },
  { id: 'seedance-2-fast', label: 'Seedance 2 Fast', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'seedance-2-fast' },
  { id: 'seedance-2-mini', label: 'Seedance 2 Mini', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'seedance-2-mini' },
  { id: 'seedance-1-5-pro', label: 'Seedance 1.5 Pro', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie' },
  { id: 'minimax-h3', label: 'MiniMax H3', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'poyo', page: 'minimax-h3' },
  // The video model a FREE account can run (the site's FREE_TIER_VIDEO_MODEL):
  // 480p or 768p, 4 to 15 seconds.
  { id: 'minimax-h3-fast', label: 'MiniMax H3 Fast', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'vgenv', freeTier: true },
  { id: 'ltx-2-5-fast', label: 'LTX 2.5 Fast', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'replicate', page: 'ltx-2-5' },
  { id: 'wan-3-0', label: 'Wan 3.0', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie', page: 'wan-3-0' },
  { id: 'saymaker-video-v1', label: 'SayMaker Video v1', media: 'video', scenes: ['text-to-video', 'image-to-video'], provider: 'kie' },
  { id: 'kling-3-0-motion-control', label: 'Kling 3.0 Motion Control', media: 'video', scenes: ['image-to-video'], provider: 'poyo' },
  { id: 'kling-2-6-motion-control', label: 'Kling 2.6 Motion Control', media: 'video', scenes: ['image-to-video'], provider: 'poyo' },
];

export const DEFAULT_IMAGE_MODEL = 'nano-banana-2';
export const DEFAULT_VIDEO_MODEL = 'seedance-2';
/** What an anonymous caller (no API key) can afford: one text-to-image run. */
export const DEFAULT_ANON_IMAGE_MODEL = 'saymaker-image-v1';

export function findModel(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelsFor(media?: Media): Model[] {
  return media ? MODELS.filter((m) => m.media === media) : MODELS;
}
