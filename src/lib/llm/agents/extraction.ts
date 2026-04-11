import { z } from 'zod';
import { BaseAgent } from './base';

const extractionFieldDefinitionSchema = z.object({
  type: z.string().min(1),
  required: z.boolean().optional(),
  description: z.string().min(1),
});

const ExtractionInputSchema = z.object({
  rawContent: z.string().min(1),
  fieldMap: z.record(z.string(), extractionFieldDefinitionSchema),
  tone: z.enum(['professional', 'casual', 'formal', 'technical']).optional(),
});

export type ExtractionInput = z.infer<typeof ExtractionInputSchema>;

export class ExtractionAgent extends BaseAgent {
  type = 'extraction' as const;

  async validateInput(input: unknown): Promise<void> {
    const parsed = ExtractionInputSchema.parse(input);

    if (Object.keys(parsed.fieldMap).length === 0) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ['fieldMap'],
          message: 'fieldMap must contain at least one field',
        },
      ]);
    }
  }

  buildPrompt(context: unknown): string {
    const input = ExtractionInputSchema.parse(context);

    const fieldDescriptions = Object.entries(input.fieldMap)
      .map(([fieldName, definition]) => {
        return `- ${fieldName} | type=${definition.type} | required=${definition.required ? 'true' : 'false'} | description=${definition.description}`;
      })
      .join('\n');

    return [
      'You are a deterministic information extraction engine.',
      'Extract ONLY values explicitly supported by the provided text.',
      'If a value is missing, return null and include a short note in missingFields.',
      'Do not invent data.',
      '',
      'Return valid JSON with this exact shape:',
      '{',
      '  "fields": { "fieldName": <value|null> },',
      '  "missingFields": ["fieldName"],',
      '  "notes": ["short note"]',
      '}',
      '',
      'Field map:',
      fieldDescriptions,
      '',
      'Raw content:',
      input.rawContent,
    ].join('\n');
  }

  parseResponse(response: string): string {
    return response.trim();
  }
}
