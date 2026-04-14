/** @jest-environment node */

jest.mock('@/lib/tool-routes/guards', () => ({
  enforceUsageGuards: jest.fn(),
  parseAndValidateRequest: jest.fn(),
  requireAvailableModel: jest.fn(),
  requireAuthenticatedUser: jest.fn(),
  requireOwnedProject: jest.fn(),
}));

import {
  evaluateExtractionAcceptance,
  summarizeConsistencyDiagnostics,
} from '@/app/api/tools/extraction/generate/route';

const baseFieldMap = {
  business_type: {
    type: 'select',
    required: true,
    description: 'Tipo business',
  },
  testimonials_sources: {
    type: 'array',
    required: false,
    description: 'Proof',
  },
};

describe('summarizeConsistencyDiagnostics', () => {
  it('returns hard_accept on full match', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: { business_type: 'B2B' },
        missingFields: ['testimonials_sources'],
        notes: 'ok',
      },
      baseFieldMap,
    );

    expect(diagnostics.consistencyDecision).toBe('hard_accept');
    expect(diagnostics.knownExtractedCount).toBe(1);
    expect(diagnostics.knownMissingCount).toBe(1);
    expect(diagnostics.overlapCount).toBe(0);
  });

  it('returns reject on overlap', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: { business_type: 'B2B' },
        missingFields: ['business_type'],
        notes: '',
      },
      baseFieldMap,
    );

    expect(diagnostics.consistencyDecision).toBe('reject');
    expect(diagnostics.consistencyDecisionReason).toBe('overlap_detected');
    expect(diagnostics.overlapCount).toBe(1);
  });

  it('tracks unknown keys without rejecting known-key consistency', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: {
          business_type: 'B2B',
          proof_context: { testimonials_sources: [] },
          extra_field: 'x',
        },
        missingFields: ['testimonials_sources', 'another_unknown'],
        notes: 'partial',
      },
      baseFieldMap,
    );

    expect(diagnostics.consistencyDecision).toBe('hard_accept');
    expect(diagnostics.unknownExtractedSample).toEqual(
      expect.arrayContaining(['proof_context', 'extra_field']),
    );
    expect(diagnostics.unknownMissingSample).toEqual(['another_unknown']);
  });

  it('returns soft_accept on structured signal without known keys', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: { nested: { foo: 'bar' } },
        missingFields: [],
        notes: 'partial',
      },
      baseFieldMap,
    );

    expect(diagnostics.consistencyDecision).toBe('soft_accept');
    expect(diagnostics.consistencyDecisionReason).toBe('no_known_keys_but_structured_signal');
  });

  it('returns reject when no extraction signal is present', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: {},
        missingFields: [],
        notes: '',
      },
      baseFieldMap,
    );

    expect(diagnostics.consistencyDecision).toBe('reject');
    expect(diagnostics.consistencyDecisionReason).toBe('no_signal');
  });
});

describe('evaluateExtractionAcceptance', () => {
  it('returns soft_accept when critical coverage reaches threshold', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: { nested: { foo: 'bar' } },
        missingFields: ['testimonials_sources'],
        notes: 'partial',
      },
      {
        business_type: {
          type: 'select',
          required: false,
          description: 'Tipo business',
        },
      },
    );

    const acceptance = evaluateExtractionAcceptance({
      parseOk: true,
      schemaOk: true,
      diagnostics,
    });

    expect(acceptance.acceptance).toBe('soft_accept');
  });

  it('returns reject when critical coverage is below threshold in soft path', () => {
    const diagnostics = summarizeConsistencyDiagnostics(
      {
        fields: { nested: { foo: 'bar' } },
        missingFields: [],
        notes: 'partial',
      },
      baseFieldMap,
    );

    const acceptance = evaluateExtractionAcceptance({
      parseOk: true,
      schemaOk: true,
      diagnostics,
      criticalFieldCoverageThreshold: 0.6,
    });

    expect(acceptance.acceptance).toBe('reject');
    expect(acceptance.acceptanceReason).toBe('critical_coverage_below_threshold');
  });
});