---
mode: agent
model: Claude Sonnet 4
---

<!-- markdownlint-disable-file -->

# Implementation Prompt: Native Login Credentials + Google OAuth

## Task Overview

Implement native credentials login and admin password lifecycle while preserving existing Google OAuth and database-session behavior.

## Implementation Instructions

### Step 1: Create Changes Tracking File

You WILL create or update [../implementation/feature-native-login-credentials-google-oauth-tracker-1.md](../implementation/feature-native-login-credentials-google-oauth-tracker-1.md).

### Step 2: Execute Implementation

You WILL follow [.github/instructions/git-commit-style.instructions.md](../../.github/instructions/git-commit-style.instructions.md)
You WILL systematically implement [../implementation/feature-native-login-credentials-google-oauth-implementation-plan-1.md](../implementation/feature-native-login-credentials-google-oauth-implementation-plan-1.md) task-by-task
You WILL follow ALL project standards and conventions

**CRITICAL**: If ${input:phaseStop:true} is true, you WILL stop after each Phase for user review.
**CRITICAL**: If ${input:taskStop:false} is true, you WILL stop after each Task for user review.

### Step 3: Cleanup

When ALL Phases are checked off (`[x]`) and completed you WILL do the following:

1. You WILL provide a markdown style link and a summary of all changes from [../implementation/feature-native-login-credentials-google-oauth-tracker-1.md](../implementation/feature-native-login-credentials-google-oauth-tracker-1.md) to the user:

   - You WILL keep the overall summary brief
   - You WILL add spacing around any lists
   - You MUST wrap any reference to a file in a markdown style link

2. You WILL provide markdown style links to [../implementation/feature-native-login-credentials-google-oauth-implementation-plan-1.md](../implementation/feature-native-login-credentials-google-oauth-implementation-plan-1.md), [../implementation/feature-native-login-credentials-google-oauth-execution-plan-1.md](../implementation/feature-native-login-credentials-google-oauth-execution-plan-1.md), and [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md).
3. You WILL reference [../prompts/native-login-credentials-google-oauth-implementation-prompt.md](../prompts/native-login-credentials-google-oauth-implementation-prompt.md) as the archived execution prompt source.

## Success Criteria

- [ ] Changes tracking file created
- [ ] All plan items implemented with working code
- [ ] All detailed specifications satisfied
- [ ] Project conventions followed
- [ ] Changes file updated continuously
