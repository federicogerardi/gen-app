/** @jest-environment node */

import { parseDocument } from '@/lib/document-parser';
import * as mammoth from 'mammoth';

jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
}));

const mockedExtractRawText = mammoth.extractRawText as jest.MockedFunction<typeof mammoth.extractRawText>;

describe('document parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses DOCX with mammoth and normalizes entities', async () => {
    mockedExtractRawText.mockResolvedValue({
      value: 'Titolo &amp; Sottotitolo\n\nDettaglio&nbsp;cliente',
      messages: [],
    });

    const result = await parseDocument(
      Buffer.from('fake-docx-content'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'briefing.docx',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.text).toContain('Titolo & Sottotitolo');
    expect(result.data.text).toContain('Dettaglio cliente');
  });

  it('returns parse error when mammoth fails', async () => {
    mockedExtractRawText.mockRejectedValue(new Error('Invalid DOCX'));

    const result = await parseDocument(
      Buffer.from('fake-docx-content'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'broken.docx',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('PARSE_ERROR');
  });

  it('parses markdown and normalizes html entities', async () => {
    const result = await parseDocument(
      Buffer.from('Testo &amp; valore\n\n\nRiga 2'),
      'text/markdown',
      'briefing.md',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.text).toBe('Testo & valore\n\nRiga 2');
  });
});
