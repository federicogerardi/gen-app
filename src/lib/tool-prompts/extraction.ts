import 'server-only';

import { injectTemplateValues, loadPromptSource } from './loader';
import { TOOL_PROMPT_REGISTRY } from './registry';
import type { ExtractionRequest } from '@/lib/tool-routes/schemas';

type ExtractionPromptInput = Pick<ExtractionRequest, 'rawContent' | 'fieldMap' | 'tone' | 'notes'> & {
  responseMode?: ExtractionRequest['responseMode'];
};

export async function buildExtractionPrompt(input: ExtractionPromptInput): Promise<string> {
  const responseMode = input.responseMode ?? 'structured';

  if (responseMode === 'text') {
    const requiredFieldList = Object.entries(input.fieldMap)
      .filter(([, definition]) => definition.required)
      .map(([fieldName]) => fieldName)
      .sort();

    const requiredFields = requiredFieldList.join(', ');
    const requiredChecklist = requiredFieldList.length > 0
      ? requiredFieldList.map((fieldName) => `- ${fieldName}: <valore sintetico oppure "Non emerso dal documento">`).join('\n')
      : '- Nessun campo required esplicito nella field map.';

    return [
      '# BRIEF EXTRACTION CONTEXT',
      'Sei un assistente che crea un contesto operativo sintetico e riusabile per la generazione funnel.',
      'Restituisci SOLO testo markdown in italiano, senza JSON e senza blocchi di codice.',
      'Contratto di output (obbligatorio):',
      '- Usa ESATTAMENTE le sezioni sotto, nello stesso ordine.',
      '- Ogni sezione deve avere 2-5 bullet point sintetici.',
      '- Ogni bullet deve contenere solo informazioni presenti nel documento.',
      '- Se un dato non emerge chiaramente, scrivi: Non emerso dal documento.',
      '- Evita ipotesi, invenzioni e consigli strategici non supportati dal testo.',
      '- Quando disponibile, privilegia dati concreti (range prezzo, segmenti, metriche, prove).',
      '- Lunghezza target: 220-420 parole.',
      '',
      'Sezioni obbligatorie:',
      '## Business Context',
      '## Offer & Delivery Context',
      '## Qualification Context',
      '## Segmentation & Lead Magnet Context',
      '## Belief Context',
      '## Funnel Goal Context',
      '## Proof Context',
      '## Missing / Unclear',
      '## Required Fields Checklist',
      '',
      `Tono richiesto: ${input.tone}`,
      `Campi prioritari (required=true): ${requiredFields || 'non specificati'}`,
      `Note: ${input.notes?.trim() || 'Nessuna'}`,
      '',
      'Nel blocco ## Missing / Unclear elenca solo gap utili ai prompt successivi (dati mancanti, ambiguita, claim non verificabili).',
      'Nel blocco ## Proof Context, quando riporti testimonianze usa sempre testo virgoletato + fonte nella stessa riga (formato: - "citazione" - Nome, ruolo/fonte).',
      'Non inserire nomi testimonial senza almeno una citazione associata; in assenza di citazioni usa: Non emerso dal documento.',
      'Nel blocco ## Required Fields Checklist usa esattamente la lista seguente e compila ogni riga senza aggiungere nuovi campi:',
      requiredChecklist,
      '',
      'Raw content:',
      input.rawContent,
    ].join('\n');
  }

  const template = await loadPromptSource(TOOL_PROMPT_REGISTRY.extraction.generation);

  const fieldMap = Object.entries(input.fieldMap)
    .map(([fieldName, definition]) => {
      return `- ${fieldName}: type=${definition.type}, required=${definition.required ? 'true' : 'false'}, description=${definition.description}`;
    })
    .join('\n');

  const context = [
    `Tono richiesto: ${input.tone}`,
    'Field map:',
    fieldMap,
    `Note: ${input.notes?.trim() || 'Nessuna'}`,
    'Raw content:',
    input.rawContent,
  ].join('\n\n');

  return injectTemplateValues(template, { context });
}
