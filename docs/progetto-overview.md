# Progetto Overview: LLM Artifact Generation Hub

**Versione**: 1.1  
**Status**: APP OPERATIVA SU DEV/PROD + TOOL MVP ATTIVI + HARDENING CONTINUO  
**Data**: 2026-04-13  
**Destinatario**: Stakeholder e Team di Progetto

---

## Executive Summary

Stiamo costruendo un **Hub di Generazione Artefatti con AI/LLM** che permette ai nostri MediaBuyer e SEO Specialist di creare contenuti di alta qualità in minuti invece di ore.

### Benefici Principali
- ⚡ **3-5x più veloce**: Generazione contenuti da ore a minuti
- 🎯 **A/B Testing**: Genera varianti rapidamente
- 💰 **Costi controllati**: Budget e quota per utente
- 👥 **50 utenti**: Accesso interno con Google OAuth aziendale
- 📊 **Monitoraggio**: Admin dashboard per tracking spesa/utilizzo

---

## Vision + Obiettivi

### Vision
> Democratizzare la creazione di contenuti high-quality permettendo il nostro team di focalizzarsi su strategie anziché esecuzione tattica.

### Obiettivi Quantitativi (primi 3 mesi)
1. **Adozione**: 40/50 utenti attivi (80%)
2. **Efficienza**: -60% tempo in copywriting
3. **Qualità**: 90%+ soddisfazione utenti sui risultati
4. **Costo**: Budget mantenuto sotto $500/mese LLM

### Obiettivi Qualitativi
- Interfaccia intuitiva (no training richiesto)
- Tool affidabili 24/7
- Integrazione con workflow esistenti

---

## Stakeholder & Ownership

| Ruolo | Nome | Responsabilità |
|-------|------|-----------------|
| **Product Owner** | [Nome] | Visione, priorità, decisions |
| **Tech Lead** | [Nome] | Architettura, technical decisions |
| **Designer** | [Nome] | UX/UI, accessibilità |
| **DevOps** | [Nome] | Deploy, monitoring, infrastructure |
| **Admin** | [Nome] | User management, quota oversight |

---

## Scope & Scale

### Utenti
- **50 utenti interni** (team mediabuying + SEO)
- **Google OAuth** aziendale (email @company.com)
- **Ruoli**: Basic user o Admin

### Tool Workflows Attivi (MVP)
1. **Meta Ads**: varianti ad copy complete (hook, body, headline, CTA)
2. **Funnel Pages**: processo multi-step (optin page, quiz questions, VSL script)

### Evoluzione Tool
- il perimetro MVP attivo include solo `Meta Ads` e `Funnel Pages`
- eventuali route/tool legacy fuori perimetro sono da considerare refusi e non fanno parte dell'applicazione pubblica

### Modelli LLM
- Registry modelli dinamico persistito in DB (`LlmModel`)
- Gestione admin via GUI con CRUD (`/api/admin/models` e `/api/admin/models/{id}`)
- Catalogo pubblico usato dai tool tramite `GET /api/models` (solo modelli attivi)
- Default model configurabile da admin (`isDefault`)
- Seed/fallback statico controllato mantenuto per continuita operativa

### Limiti
- **1000 generazioni/mese** per utente (default)
- **$500/mese** budget LLM (tuning possibile)
- **Salvataggio progetti**: Storage illimitato
- **Artifact history**: Nessuna retention policy applicata nel MVP corrente

---

## Timeline & Milestones

### Fase 1: Foundation (2 settimane)
- Database + authentication
- Infrastructure su Vercel
- **Deliverable**: Ambiente dev/staging funzionante

### Fase 2-3: Core Features (3 settimane)
- LLM integration + streaming
- API endpoints
- Admin management
- **Deliverable**: Funzionalità complete

### Fase 4-5: Frontend + UX (2 settimane)
- React UI con shadcn/ui
- Streaming consumer
- Admin dashboard
- **Deliverable**: App con all features

### Fase 6: Testing + Deploy (1 settimana)
- QA + security audit
- Monitoring setup
- Production deployment
- **Deliverable**: App live al 100%

**Total Duration**: 6-8 settimane

---

## Budget & Cost Breakdown

### Infrastructure (Mensile)
| Componente | Costo | Note |
|-----------|-------|------|
| Vercel (hosting) | variabile | Hosting Next.js + preview environments |
| PostgreSQL (5GB) | $15 | Database |
| Redis (optional) | $15 | Caching |
| **Total Infra** | **$41** | Scalable, low-cost |

### LLM Costs (Stima Mensile)
- **Scenario conservativo**: $100-200 (50 utenti, moderato uso)
- **Scenario standard**: $300-400 (active users, daily usage)
- **Scenario peak**: $500 (heavy usage near quotas)

### Development (One-Time)
- ~200 ore di engineering
- ~40 ore di QA/testing
- ~20 ore di deployment/monitoring
- Deploy da agenti AI (riduce costi vs team)

**Total First Month**: ~$350-500 (infra + LLM)  
**Monthly Recurring**: ~$350-450

---

## Technical Stack Rationale

### Frontend
- **React 19** → Modern, performante, optimal for streaming UX
- **shadcn/ui** → Componenti accessible + belle design
- **Tailwind CSS** → Rapid development, consistent design
- **TanStack Query** → Server state management, caching

### Backend
- **Next.js 16** → Full-stack TypeScript, App Router, Route Handlers, `proxy.ts`
- **Prisma 7 + PrismaPg** → Prisma client generato in `src/generated/prisma`, compatibile con il nuovo modello a driver adapter
- **PostgreSQL** → ACID compliance, stable, proven
- **Prisma ORM** → Type-safe, auto-migrations, excellent DX
- **NextAuth.js** → Secure auth, Google OAuth, session management

### LLM Integration
- **OpenRouter SDK** → Multi-model support, easy switching
- **Server-Sent Events** → Real-time streaming, progressive display
- **Retry + fallback** → Reliability, graceful degradation
- **Prompt modular layer** → registry + loader server-only in `src/lib/tool-prompts`, con template runtime statici tipizzati e sorgenti markdown versionate

### DevOps
- **Vercel** -> Deployment produzione da `main`, preview workflow tramite PR su `dev`
- **GitHub Actions** → CI/CD automation, testing
- **Sentry** → Error tracking, monitoring

---

## Responsible AI Considerations

### Bias Prevention
- ✅ Log all generazioni per audit trail
- ✅ Track model performance variance
- ✅ Regular bias audits con diverse inputs

### Transparency
- ✅ Mostra quale modello sta generando
- ✅ Mostra token count e costo
- ✅ User può scegliere modello

### Privacy & Data
- ✅ Nessuna memorizzazione prompts in cloud esterno
- ✅ Dati salvati solo in nostro DB
- ✅ Audit trail per compliance

### Accessibility
- ✅ WCAG 2.1 AA compliance
- ✅ Screen reader support
- ✅ Keyboard navigation full
- ✅ Inclusive design (disabilities, diverse users)

---

## Risk Mitigation

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-----------|---------|-----------|
| **OpenRouter outage** | Media | Alto | Fallback models pre-configured |
| **Rate limit exhaustion** | Media | Medio | Strict quota enforcement |
| **Poor UX adoption** | Bassa | Medio | User testing early (weeks 1-2) |
| **Security vulns** | Bassa | Alto | Security audit pre-prod |
| **Cost overrun** | Media | Medio | Budget alerts, quota limits |
| **Integration issues** | Bassa | Medio | Staging env mirroring prod |

---

## Success Metrics (KPIs)

### Adoption
- [ ] 40/50 utenti attivi entro mese 1
- [ ] 3+ generazioni/user/week entro mese 2
- [ ] 80%+ daily active users entro mese 3

### Efficiency
- [ ] -60% tempo in copywriting (self-reported)
- [ ] -50% time-to-market per campaign
- [ ] 90%+ artifact reusable senza edits

### Quality
- [ ] 90%+ user satisfaction (NPS > 70)
- [ ] <5% error rate
- [ ] <2.5s LCP (page load)

### Cost
- [ ] Spesa LLM under budget (< $500/month)
- [ ] Cost per artifact < $0.10
- [ ] Infrastructure cost stable

### Operational
- [ ] 99.5% uptime
- [ ] 0 critical security incidents
- [ ] <1 hour incident response time

---

## Decisioni Architetturali Critiche

### 1. Streaming vs Batch
**Decisione**: Primary streaming, batch fallback  
**Rationale**: UX superiore (real-time feedback), mimics ChatGPT expectations  
**Trade-off**: Più complesso da implementare, ma worth it per UX

### 2. Rate Limiting Strategy
**Decisione**: 1000 req/month per user, $500 total budget  
**Rationale**: Fair sharing, cost control, prevents abuse  
**Trade-off**: Power users posson richiedere aumento

### 3. Modular Controller Architecture
**Decisione**: Agents pluggable, provider abstraction  
**Rationale**: Facile aggiungere nuovi artifact types, OpenRouter-agnostic  
**Trade-off**: Più boilerplate, ma super maintainable

#### ADRs Complete
- **ADR 001**: Modular LLM Controller Architecture
- **ADR 002**: Streaming vs Batch Responses  
- **ADR 003**: Rate Limiting & Quota Strategy

Vedi `/docs/adrs/` per dettagli tecnici completi.

---

## Communication & Governance

### Decision Making
- **Weekly sync**: Product + Tech lead + Designer (30min)
- **Bi-weekly demo**: Stakeholders + users (1 hour)
- **Monthly review**: Strategy + metrics (1 hour)

### Change Management
- User beta access: weeks 5-6 (20 power users)
- Feedback incorporation: week 7
- General release: week 8

### Support Model
- **Day 1-30**: Daily standup di team
- **Month 2+**: Weekly check-ins
- **Admin channel**: Slack #genapp-support

---

## Documentazione per Agenti AI

La documentazione tecnica completa è destinata agli **agenti AI che implementeranno il codice**:

- [ ] **blueprint.md** → Architettura completa, data models, tecnologie
- [ ] **implementation-plan.md** → 8 fasi con deliverables e acceptance criteria
- [ ] **api-specifications.md** → Tutti gli endpoint, formato JSON, error codes
- [ ] **ux-strategy.md** → User journeys, personas, interaction patterns
- [ ] **accessibility.md** → WCAG 2.1 AA compliance, testing procedures
- [ ] **ADRs** → Decisioni architetturali critiche + rationale

Gli agenti potron leggere questi documenti e implementare il codice senza ambiguità.

---

## Sign-Off Checklist

- [ ] Product owner approva vision + obiettivi
- [ ] Tech lead approva architettura + stack
- [ ] Budget approva spending cap
- [ ] Security team clears approach
- [ ] Compliance verifica GDPR/privacy compliance
- [ ] Team capisce timeline + milestones

---

## Next Steps

### Priorita operative (as-is)
1. [ ] Consolidare test E2E su flussi auth/db end-to-end
2. [ ] Estendere observability (Sentry + logging) sulle route non ancora coperte
3. [ ] Chiudere hardening UX/accessibilita cross-device
4. [ ] Proseguire monitoraggio costi/modelli e quality gate CI

---

## Contatti & FAQ

### Domande Frequenti

**Q: Posso usare il tool oltre 1000 generazioni/month?**  
A: Contatta l'admin. Possibile aumento quota se justified by usage.

**Q: È disponibile offline?**  
A: No, richiede connessione internet (dipende da OpenRouter).

**Q: Posso esportare i miei artifacts?**  
A: Sì, copy/paste sempre disponibile. Export in bulk (CSV, ZIP) coming in phase 2.

**Q: Chi ha accesso ai miei artifacts?**  
A: Solo te + admin (con audit logging). Condivisione team: future feature.

**Q: Cosa succede ai dati nel tempo?**  
A: Nel perimetro MVP attuale non e applicata una retention policy automatica sugli artifact.

---

## Allegati & Riferimenti

- 📄 ADR 001: Modular LLM Controller Architecture
- 📄 ADR 002: Streaming vs Batch Responses
- 📄 ADR 003: Rate Limiting & Quota Strategy
- 📄 blueprint.md
- 📄 implementation-plan.md
- 📄 api-specifications.md
- 📄 ux-strategy.md  
- 📄 accessibility.md

---

## Versione Historia

| Data | Versione | Autore | Cambio |
|------|----------|--------|--------|
| 2026-04-07 | 1.0 | Architecture Team | Initial release |

---

## Disclaimer

Questa documentazione contiene piani tecnici e non è intesa come impegno vincolante di timeline/costi. Le stime potrebbero variare basato su:
- Scopechange requests
- Team capacity
- External API reliability
- Feedback utente durante dev

Vedremo ci aggiorniamo settimanalmente su progress + risks.
