/** @jest-environment node */

import { ExtractionAgent } from '@/lib/llm/agents/extraction';

describe('ExtractionAgent shared schema', () => {
  it('accepts supported extraction field type from shared schema', async () => {
    const agent = new ExtractionAgent();

    await expect(
      agent.validateInput({
        rawContent: 'Contenuto di input abbastanza lungo per il parsing.',
        fieldMap: {
          business_type: {
            type: 'select',
            required: true,
            description: 'Tipo di business',
          },
        },
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects unsupported extraction field type to prevent schema drift', async () => {
    const agent = new ExtractionAgent();

    await expect(
      agent.validateInput({
        rawContent: 'Contenuto di input abbastanza lungo per il parsing.',
        fieldMap: {
          business_type: {
            type: 'freeform',
            required: true,
            description: 'Tipo di business',
          },
        },
      }),
    ).rejects.toThrow();
  });
});
