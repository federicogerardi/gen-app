---
description: "Use when editing LLM generation internals in src/lib/llm (orchestrator.ts, agents/*, providers/*, streaming.ts, cost calculations). Covers orchestrator-agent-provider boundaries, routing logic, streaming chunk semantics, input normalization, and deterministic cost accounting aligned with persisted artifact metadata."
name: "LLM Generation Architecture Rules"
applyTo: "src/lib/llm/**/*.ts"
---
# LLM Generation Architecture Rules

- Preserve the orchestrator-to-agent-to-provider boundary; do not collapse responsibilities across layers.
- Keep tool and artifact routing decisions centralized in orchestrator logic.
- Keep provider modules focused on transport, retries, and model invocation details.
- Preserve streaming contracts and chunk semantics expected by route handlers and client hooks.
- Keep cost accounting deterministic and aligned with persisted artifact metadata.
- Validate and normalize agent inputs before prompt construction.
- Prefer small, composable helpers over monolithic generation functions.
- Update unit tests whenever orchestrator, streaming, agents, or cost modules change.

Reference docs:
- docs/adrs/001-modular-llm-controller-architecture.md
- docs/adrs/002-streaming-vs-batch-responses.md
- docs/adrs/003-rate-limiting-quota-strategy.md
