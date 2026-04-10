---
description: "Use when creating, updating, or debugging prompt templates and loaders in src/lib/tool-prompts (meta-ads, funnel-pages, templates.ts, loader.ts, registry.ts). Covers prompt-source markdown strategy, typed static runtime templates, registry mapping, safe variable interpolation, and the no-runtime-fs rule in route execution paths."
name: "Tool Prompts Layer Rules"
applyTo:
  - "src/lib/tool-prompts/**/*.ts"
  - "src/lib/tool-prompts/prompts/**/*.md"
---
# Tool Prompts Layer Rules

- Keep editable prompt source markdown versioned under src/lib/tool-prompts/prompts.
- Keep runtime prompt material in typed static templates and loader helpers.
- Never introduce runtime fs.readFile in route execution paths for prompt loading.
- Make route modules consume prompt builders; avoid large inline prompt strings in endpoints.
- Keep registry mappings explicit and deterministic for each tool and funnel step.
- Preserve interpolation safety: normalize optional fields and avoid undefined string injection.
- When prompt behavior, mapping, or interpolation changes, update tests in tests/unit/tool-prompts.test.ts and related route integration tests.

Reference docs:
- docs/adrs/001-modular-llm-controller-architecture.md
- docs/implement-index.md
- docs/prompts/README.md
