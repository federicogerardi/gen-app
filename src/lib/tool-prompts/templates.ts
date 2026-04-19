import { TOOL_PROMPT_REGISTRY, type ToolPromptPath } from './registry';
import { EXTRACTION_GENERATION_TEMPLATE } from './extraction-templates';
import { FUNNEL_OPTIN_TEMPLATE, FUNNEL_QUIZ_TEMPLATE, FUNNEL_VSL_TEMPLATE } from './funnel-templates';
import { NEXTLAND_LANDING_TEMPLATE, NEXTLAND_THANK_YOU_TEMPLATE } from './nextland-templates';

export const PROMPT_TEMPLATES: Record<ToolPromptPath, string> = {
  [TOOL_PROMPT_REGISTRY.extraction.generation]: EXTRACTION_GENERATION_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.funnel.optin]: FUNNEL_OPTIN_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.funnel.quiz]: FUNNEL_QUIZ_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.funnel.vsl]: FUNNEL_VSL_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.nextland.landing]: NEXTLAND_LANDING_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.nextland.thankYou]: NEXTLAND_THANK_YOU_TEMPLATE,
};
