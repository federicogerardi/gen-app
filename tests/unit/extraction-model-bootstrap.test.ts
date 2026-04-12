import {
  bootstrapExtractionModels,
  getExtractionBootstrapModels,
} from '@/lib/llm/extraction-model-bootstrap';

describe('extraction-model-bootstrap', () => {
  it('returns bootstrap models aligned with extraction chain order', () => {
    const models = getExtractionBootstrapModels();

    expect(models.map((item) => item.modelId)).toEqual([
      'anthropic/claude-3.7-sonnet',
      'openai/gpt-4.1',
      'openai/o3',
    ]);
    expect(models.every((item) => item.inputCostPer1k > 0)).toBe(true);
    expect(models.every((item) => item.outputCostPer1k > 0)).toBe(true);
  });

  it('creates missing models with non-destructive defaults', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);

    const result = await bootstrapExtractionModels({ findMany, create, update }, new Date('2026-04-12T10:00:00.000Z'));

    expect(create).toHaveBeenCalledTimes(3);
    expect(update).not.toHaveBeenCalled();
    expect(result.created).toEqual([
      'anthropic/claude-3.7-sonnet',
      'openai/gpt-4.1',
      'openai/o3',
    ]);

    const firstCreateCall = create.mock.calls[0]?.[0];
    expect(firstCreateCall?.data?.isDefault).toBe(false);
    expect(firstCreateCall?.data?.isActive).toBe(true);
  });

  it('reactivates inactive records and preserves existing defaults', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        modelId: 'anthropic/claude-3.7-sonnet',
        isActive: false,
        isDefault: true,
      },
      {
        modelId: 'openai/gpt-4.1',
        isActive: true,
        isDefault: false,
      },
      {
        modelId: 'openai/o3',
        isActive: true,
        isDefault: false,
      },
    ]);
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);

    const result = await bootstrapExtractionModels({ findMany, create, update });

    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { modelId: 'anthropic/claude-3.7-sonnet' },
      data: { isActive: true },
    });
    expect(result.reactivated).toEqual(['anthropic/claude-3.7-sonnet']);
    expect(result.preservedDefault).toEqual(['anthropic/claude-3.7-sonnet']);
  });

  it('is idempotent when all required models are already active', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { modelId: 'anthropic/claude-3.7-sonnet', isActive: true, isDefault: false },
      { modelId: 'openai/gpt-4.1', isActive: true, isDefault: true },
      { modelId: 'openai/o3', isActive: true, isDefault: false },
    ]);
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);

    const result = await bootstrapExtractionModels({ findMany, create, update });

    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(result.alreadyActive).toEqual([
      'anthropic/claude-3.7-sonnet',
      'openai/gpt-4.1',
      'openai/o3',
    ]);
    expect(result.preservedDefault).toEqual(['openai/gpt-4.1']);
  });
});