# Code Review: Capacity Overflow Risk (20 utenti medi connessi)
**Ready for Production**: Condizionale (si, con guardrail operativi attivi)
**Critical Issues**: 0

## Priority 1 (Must Fix) ⛔
- Nessuna vulnerabilita bloccante confermata nel perimetro analizzato.

## Priority 2 (High) ⚠️
- Rischio saturazione provider LLM (429/throttling) in caso di picchi sincronizzati.
  - Impatto:
    - aumento latenza end-to-end;
    - timeout e fallimenti intermittenti lato tool generation;
    - degradazione UX su stream lunghi.
  - Mitigazione richiesta:
    - limite hard di generazioni concorrenti per utente;
    - backoff esponenziale con jitter sui retry;
    - circuit breaker su soglia errori provider.
- Rischio overflow economico (quota/costi) prima dell'overflow tecnico.
  - Impatto:
    - burn budget accelerato su utenti heavy;
    - rischio indisponibilita del servizio a fine finestra quota.
  - Mitigazione richiesta:
    - cap giornaliero per utente e cap globale per workspace;
    - allarmi realtime su costo/token e su trend di consumo.

## Priority 3 (Medium) 📌
- Rischio saturazione connessioni DB (Prisma/PostgreSQL) durante ondate di salvataggi artifact + update quota.
  - Mitigazione:
    - ottimizzazione query critiche;
    - controllo pool/connection limit;
    - monitoraggio query lente e lock contention.
- Rischio accumulo stream SSE concorrenti con incremento memoria runtime.
  - Mitigazione:
    - timeout di stream coerenti con SLA;
    - limite stream contemporanei per utente;
    - fallback graceful su backlog elevato.

## Priority 4 (Low) ✅
- Rischi frontend/UI secondari rispetto ai colli di bottiglia API/LLM/DB.

## Capacity Heuristic (20 utenti online)
Formula operativa:

$$
C = U \times p \times r
$$

Dove:
- $U$ = utenti connessi;
- $p$ = percentuale utenti che genera nello stesso istante;
- $r$ = richieste in-flight per utente.

Scenario realistico di riferimento:

$$
U=20,\ p=0.4,\ r=1.5 \Rightarrow C\approx 12
$$

Con circa 12 generazioni simultanee, il primo collo di bottiglia atteso resta il provider (throughput/429), seguito da timeout route e saturazione progressiva DB sotto burst.

## Recommended Changes
1. Imporre un semaforo di concorrenza per utente (`max 1-2` job attivi).
2. Introdurre una coda di generazione lato server (FIFO) con limiti globali.
3. Applicare retry idempotenti con backoff esponenziale + jitter (no retry aggressivi).
4. Definire e monitorare SLO/SLA minimi:
   - p95 latenza endpoint generate;
   - percentuale 429/5xx;
   - stream concorrenti attivi;
   - tempo medio completamento generazione.
5. Configurare alerting con soglie operative (verde/giallo/rosso) e runbook di risposta.

## Tabella soglie operative (verde/giallo/rosso)

| Metrica | Verde | Giallo | Rosso | Azione immediata |
| --- | --- | --- | --- | --- |
| Generazioni simultanee globali (`C`) | `<= 8` | `9-12` | `>= 13` | In rosso: attiva coda hard e limita nuovi job non prioritari. |
| p95 latenza endpoint generate | `<= 8s` | `8-15s` | `> 15s` | In rosso: riduci `max output tokens` e applica shed del traffico. |
| Errori provider 429 (5 min rolling) | `< 2%` | `2-5%` | `> 5%` | In rosso: circuit breaker + backoff con jitter + riduzione concorrenza. |
| Errori 5xx API generate (5 min rolling) | `< 1%` | `1-3%` | `> 3%` | In rosso: freeze deploy, fallback controllato e triage incident. |
| Stream SSE attivi contemporanei | `<= 20` | `21-30` | `> 30` | In rosso: cap stream per utente e timeout aggressivo su stream inattivi. |
| Tempo medio completamento generazione | `<= 25s` | `26-45s` | `> 45s` | In rosso: riduci lunghezza prompt/contesto e scala via coda. |
| Saturazione pool DB (connessioni attive) | `< 65%` | `65-80%` | `> 80%` | In rosso: throttling write non critiche e tuning query lente. |
| Costo orario vs budget giornaliero | `< 8%/h` | `8-12%/h` | `> 12%/h` | In rosso: applica cap temporaneo per utente e blocca job high-cost. |

Note operative:
- Le soglie sono calibrate per scenario base da 20 utenti medi online e vanno ritarate dopo 1-2 settimane di telemetria reale.
- Trigger consigliato: alert giallo su 10 minuti continui, alert rosso immediato su 3 finestre consecutive da 1 minuto.
- KPI di uscita emergenza: ritorno simultaneo a giallo/verde su `p95`, `429` e `5xx` per almeno 15 minuti.

## Executive Assessment
Con 20 utenti medi il sistema e generalmente in fascia gestibile, ma il rischio di overflow diventa alto durante picchi di generazione simultanea. Nel contesto corrente il failure mode piu probabile e l'overflow di provider/quota, non il collasso del frontend.