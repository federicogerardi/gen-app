---
description: "Use when creating, updating, moving, archiving, or reorganizing project documentation under docs/. Covers naming conventions, folder taxonomy, as-is documentation discipline, GitHub-backed status alignment, and rational information architecture for markdown files."
name: "Docs Taxonomy Guardrails"
applyTo: "docs/**/*.md"
---
# Docs Taxonomy Guardrails

- Treat docs/ as the canonical project documentation root unless the user explicitly defines a different documentation root.
- Keep documentation aligned to the current repository as-is state; when documentation and repository state diverge, update the docs to match verified reality.
- Treat GitHub repository state as living project memory for precise status, history, PR closure context, and issue-linked evidence.

## Placement Rules

- Keep only high-signal entrypoint or cross-cutting documents at the root of docs/.
- Put architecture decisions in docs/adrs/ and preserve stable ADR numbering once assigned.
- Put stable contracts, schemas, and operational specifications in docs/specifications/.
- Put active implementation plans, execution trackers, sequenced remediation plans, and feature delivery working docs in docs/implementation/.
- Put audits, gap analysis, closure reports, and review-oriented findings in docs/review/.
- Put superseded, historical, or snapshot material in docs/archive/.
- Put UX strategy, GUI plans, and interaction design material in docs/ux/.
- Put diagrams and visual architecture support docs in docs/diagrams/.
- Keep accessibility-specific guidance in docs/accessibility/.
- Treat docs/prompts/ as documentation of prompt assets and workflows, not as the runtime source of truth.

## Naming Rules

- Use lowercase kebab-case for markdown filenames.
- Make filenames describe both subject and document type, not just the topic.
- Prefer explicit suffixes such as spec, plan, tracker, closure, gap-analysis, overview, audit, or review when they clarify intent.
- Use numeric suffixes such as -1, -2 only for iterative document families that intentionally coexist.
- Use a date suffix only for time-bound snapshots, closure notes, reviews, or historical reports.
- When a date is needed, use YYYY-MM-DD.
- Avoid ambiguous names such as notes, update, misc, tmp, final, new, or draft unless they are part of an established folder convention.

## Structure Rules

- Prefer the shallowest folder depth that still preserves retrieval clarity.
- Never create empty directories.
- Never create folder templates, placeholder trees, or speculative taxonomy scaffolding.
- Create a new subfolder only when it is immediately necessary to host or receive at least one concrete markdown file being created or moved in the same change.
- If a directory is created to support a file move or reclassification, complete that file transfer in the same change so the directory is not left empty.
- During mass or gradual file reorganization, allow a directory to become transiently empty within the same logical operation if it is still serving the current reclassification pass.
- Add or update a local README when a folder accumulates enough documents that navigation would otherwise become unclear.
- Prefer consolidating overlapping documents over keeping parallel files with partially duplicated scope.
- Preserve stable paths for canonical documents when possible; if a move is necessary, update indexes and cross-links in the same change.

## Maintenance Rules

- Update an existing document when the artifact lineage is the same; create a new file only when the document purpose, lifecycle stage, or time snapshot is genuinely distinct.
- Move completed or superseded operational material to docs/archive/ when it no longer represents the active working source.
- Keep docs/README.md aligned whenever root-level structure or major document entrypoints change.
- Do not duplicate repository facts across multiple docs when one canonical page can be linked instead.
- Prefer linking to ADRs, specs, and implementation indexes instead of re-explaining their contents in multiple places.
- Grow the documentation tree only as a consequence of real content organization needs emerging from the project, not as preventive structure design.
- Apply empty-folder cleanup at the end of a coherent organization pass, not after each individual file move.
- Remove an empty directory only when it is clearly obsolete and no longer needed for the current reorganization step or near-term staged transfer.

## Existing Taxonomy Defaults

- docs/README.md is the navigation entrypoint for the documentation tree.
- docs/implement-index.md is the operational index for current priorities and status snapshots.
- docs/blueprint.md and docs/progetto-overview.md are root-level reference documents and should remain high-signal, not catch-all dumping grounds.
- docs/archive/ stores historical material that remains useful for traceability but is no longer the active operational source.

Reference docs:
- docs/README.md
- docs/implement-index.md
- docs/progetto-overview.md
- docs/blueprint.md