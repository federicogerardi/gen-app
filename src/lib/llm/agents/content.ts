import { z } from 'zod';
import { BaseAgent } from './base';

const ContentInputSchema = z.object({
  topic: z.string().min(3),
  tone: z.enum(['professional', 'casual', 'formal', 'technical']).default('professional'),
  length: z.number().int().min(50).max(5000).default(500),
  outputFormat: z.enum(['markdown', 'plain', 'html']).default('markdown'),
});

export type ContentInput = z.infer<typeof ContentInputSchema>;

export class ContentAgent extends BaseAgent {
  type = 'content' as const;

  async validateInput(input: unknown): Promise<void> {
    ContentInputSchema.parse(input);
  }

  buildPrompt(context: unknown): string {
    const input = ContentInputSchema.parse(context);
    return `You are a professional content writer.\n\nWrite a ${input.tone} piece about: ${input.topic}\n\nTarget length: approximately ${input.length} words.\nOutput format: ${input.outputFormat}\n\nProduce high-quality, engaging content without preambles or explanations.`;
  }

  parseResponse(response: string): string {
    return response.trim();
  }
}
