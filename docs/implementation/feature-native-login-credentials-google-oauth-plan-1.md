# Piano Feature: Native Login Credentials + Google OAuth

## Contesto attuale

- Auth: NextAuth v5 con provider Google, PrismaAdapter e `session.strategy = database`.
- Filtro accesso: `ALLOWED_EMAIL_DOMAINS` nel callback `signIn`.
- Ruoli: `user | admin` su modello `User`.
- API admin: endpoint di listing utenti attivo, ma nessuna creazione utente con password.
- Vincolo di prodotto: nessuna registrazione pubblica; provisioning solo admin.

## Obiettivo

Introdurre login nativo con credenziali (email/password) in affiancamento a Google OAuth, senza regressioni su sessioni database esistenti, guard admin e policy di sicurezza.

## Decisioni preliminari

- Session strategy: mantenere il percorso Google invariato e gestire il percorso credenziali in modo compatibile con le limitazioni Auth.js su `credentials + database`.
- Hash password: usare `bcryptjs` con cost factor 12.
- Reset password: in scope v1 solo reset amministrativo; self-service reset fuori scope.

## Interventi previsti

### 1) Database

- Aggiungere `passwordHash String? @db.Text` su `User` in `prisma/schema.prisma`.
- Eseguire migrazione e `prisma generate`.
- Mantenere retrocompatibilita OAuth (`passwordHash = null`).

### 2) Flusso autenticazione

- Integrare percorso credenziali con validazione Zod di email/password.
- Verificare utente per email; rifiutare login se utente assente o `passwordHash` nullo.
- Verificare password con `bcrypt.compare`.
- Mantenere controllo dominio e comportamento Google invariati.

### 3) API Admin utenti

- `POST /api/admin/users`: provisioning utente con password hashata, ruolo e default quota/budget.
- `PATCH /api/admin/users/[userId]`: reset password admin e aggiornamento campi gestionali.
- Escludere sempre `passwordHash` dalle response.

### 4) UI

- Login page: aggiungere form credentials sotto CTA Google con messaggio errore generico.
- Admin page: aggiungere form creazione utente e azione reset password.

### 5) Test

- Unit test su autorizzazione credenziali (utente mancante, hash nullo, password errata, successo).
- Integration test su endpoint admin (`401/403/400/404/409/201/200`).
- Regressione su Google OAuth invariato.

## Sequenza esecutiva consigliata

1. Decision gate e baseline sicurezza.
2. Migrazione schema.
3. Backend auth credentials.
4. API admin create/reset.
5. UI login/admin.
6. Validazione completa (`lint`, `typecheck`, `test`, `test:e2e`).

## Guardrail

- Nessun leak di `passwordHash` in API/UI/log.
- Nessuna registrazione pubblica.
- Messaggio login sempre generico: "Credenziali non valide".
- Preservare coverage minima del progetto.

## Documenti collegati

- [feature-native-login-credentials-google-oauth-implementation-plan-1.md](feature-native-login-credentials-google-oauth-implementation-plan-1.md)
- [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)
- [feature-native-login-credentials-google-oauth-tracker-1.md](feature-native-login-credentials-google-oauth-tracker-1.md)
- [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md)
