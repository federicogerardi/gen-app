import { TOOL_PROMPT_REGISTRY, type ToolPromptPath } from './registry';
import { META_ADS_GENERATION_TEMPLATE } from './meta-ads-templates';
import { EXTRACTION_GENERATION_TEMPLATE } from './extraction-templates';
import { FUNNEL_OPTIN_TEMPLATE, FUNNEL_QUIZ_TEMPLATE, FUNNEL_VSL_TEMPLATE } from './funnel-templates';

export const PROMPT_TEMPLATES: Record<ToolPromptPath, string> = {
  [TOOL_PROMPT_REGISTRY.metaAds.generation]: META_ADS_GENERATION_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.extraction.generation]: EXTRACTION_GENERATION_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.funnel.optin]: FUNNEL_OPTIN_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.funnel.quiz]: FUNNEL_QUIZ_TEMPLATE,
  [TOOL_PROMPT_REGISTRY.funnel.vsl]: FUNNEL_VSL_TEMPLATE,
};
