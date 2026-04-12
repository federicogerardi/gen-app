## Summary
- 
- 

## Pre-merge Checklist
- [ ] Target branch: `dev` (mai `main`)
- [ ] Titolo PR in formato Conventional Commits: `type(scope): subject`
- [ ] CI verde: build + typecheck + lint + test
- [ ] Nessuna conversazione di review aperta
- [ ] Nessun TODO nuovo senza issue collegata

## Env/Build Regression Checklist
- [ ] Nessuna validazione env endpoint-specific in import-time (`src/lib/env.ts`)
- [ ] Le variabili endpoint-specific sono validate nel route handler runtime corretto
- [ ] Per cron: senza `VERCEL_CRON_SECRET`
- [ ] In `NODE_ENV=production` + `VERCEL_ENV=production` ritorna `500`
- [ ] In contesti non `VERCEL_ENV=production` ritorna `503`
- [ ] Aggiornati i test integration dedicati: `tests/integration/cleanup-stale-artifacts-route.test.ts`
