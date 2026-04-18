import 'server-only';

export const PROMPT_SOURCE_ROOT = ['src', 'lib', 'tool-prompts', 'prompts'] as const;

export const TOOL_PROMPT_REGISTRY = {
  extraction: {
    generation: 'tools/extraction/prompt_generation.md',
  },
  funnel: {
    optin: 'tools/hl_funnel/prompt_optin_generator.md',
    quiz: 'tools/hl_funnel/prompt_quiz_generator.md',
    vsl: 'tools/hl_funnel/prompt_vsl_generator.md',
  },
  nextland: {
    landing: 'tools/nextland/prompt_landing_generator.md',
    thankYou: 'tools/nextland/prompt_thank_you_generator.md',
  },
} as const;

export type ToolPromptPath =
  | (typeof TOOL_PROMPT_REGISTRY.extraction)[keyof typeof TOOL_PROMPT_REGISTRY.extraction]
  | (typeof TOOL_PROMPT_REGISTRY.funnel)[keyof typeof TOOL_PROMPT_REGISTRY.funnel]
  | (typeof TOOL_PROMPT_REGISTRY.nextland)[keyof typeof TOOL_PROMPT_REGISTRY.nextland];
