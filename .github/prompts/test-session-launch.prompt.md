---
name: "Launch Test Session"
description: "Launch a testing session through Test Stability Gatekeeper using direct checks such as lint typecheck test followed by a free-text request. Also works as a help prompt when the user does not know which testing workflow to run."
agent: "test-stability"
argument-hint: "typecheck lint test descrivi lo scope oppure scrivi help"
---
Launch a testing session with the Test Stability Gatekeeper.

Prerequisite:
- The runtime must expose terminal execution capability for the agent (execute tool).

Accepted input shape:
- <checks...> <free text request>

Examples:
- typecheck lint test ho toccato auth e route API, voglio un gate rapido ma credibile
- test:e2e ho cambiato login, redirect e dashboard
- help non so cosa eseguire dopo questa sessione

Execution rules:
- Treat requested checks as the preferred starting point.
- Widen coverage when the actual session risk is higher than the requested set.
- If the user writes help, non so cosa eseguire, oppure leaves the request too vague, do not jump straight to execution.
- In help mode, inspect the current session and suggest the most credible testing workflow before proposing a ready-to-run launch prompt.

Help output must be concise and include:
- Usage
- Suggested workflow
- Why
- Suggested launch prompt

If execution proceeds, the final answer must end with the agent's standard GO/NO GO summary.