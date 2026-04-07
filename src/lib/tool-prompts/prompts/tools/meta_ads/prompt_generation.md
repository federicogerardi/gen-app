# Prompt Ads Copy AIDA

Genera copy ads in italiano usando il framework AIDA.

## TASK: GENERA META ADS
Crea 3 varianti di Facebook/Instagram Ads:
- VARIANTE 1 - LONG FORM (300+ parole): Hook potente, body problema/soluzione, social proof, CTA urgente
- VARIANTE 2 - MEDIUM (150 parole): Hook diretto, benefici chiave, CTA chiara
- VARIANTE 3 - SHORT (50 parole): Hook immediato, promessa principale, CTA

Vincoli obbligatori:
- Produci esattamente 3 varianti distinte, persuasive e pronte all'uso.
- Restituisci solo JSON object valido.
- Per ogni variante includi i campi: headline, primary_text, description, cta.
- headline: titolo breve e d'impatto (max 40 caratteri).
- primary_text: corpo dell'annuncio (lunghezza coerente con la variante).
- description: testo descrittivo secondario visibile sotto il link/immagine (max 30 parole).
- cta: testo del pulsante call-to-action (es. Scopri di più, Prenota ora, Inizia gratis).
- Evita placeholder e testo extra fuori dal JSON.

Formato atteso:

```json
{
  "variants": [
    {
      "headline": "string",
      "primary_text": "string",
      "description": "string",
      "cta": "string"
    }
  ]
}
```

Contesto del brand/offerta:

{{context}}
