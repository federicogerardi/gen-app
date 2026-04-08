import 'server-only';

export const PROMPT_SOURCE_ROOT = ['src', 'lib', 'tool-prompts', 'prompts'] as const;

export const TOOL_PROMPT_REGISTRY = {
  metaAds: {
    generation: 'tools/meta_ads/prompt_generation.md',
  },
  funnel: {
    optin: 'tools/hl_funnel/prompt_optin_generator.md',
    quiz: 'tools/hl_funnel/prompt_quiz_generator.md',
    vsl: 'tools/hl_funnel/prompt_vsl_generator.md',
  },
} as const;

export type ToolPromptPath =
  | (typeof TOOL_PROMPT_REGISTRY.metaAds)[keyof typeof TOOL_PROMPT_REGISTRY.metaAds]
  | (typeof TOOL_PROMPT_REGISTRY.funnel)[keyof typeof TOOL_PROMPT_REGISTRY.funnel];
