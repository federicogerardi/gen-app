import { z } from 'zod';
import { BaseAgent } from './base';

const SeoInputSchema = z.object({
  topic: z.string().min(3),
  targetKeywords: z.array(z.string()).min(1).max(10),
  pageType: z.enum(['landing', 'blog', 'product', 'category']).default('blog'),
  outputFormat: z.enum(['markdown', 'json']).default('markdown'),
});

export type SeoInput = z.infer<typeof SeoInputSchema>;

export class SeoAgent extends BaseAgent {
  type = 'seo' as const;

  async validateInput(input: unknown): Promise<void> {
    SeoInputSchema.parse(input);
  }

  buildPrompt(context: unknown): string {
    const input = SeoInputSchema.parse(context);
    const keywords = input.targetKeywords.join(', ');
    return `You are an expert SEO specialist.\n\nCreate SEO-optimized content for a ${input.pageType} page about: ${input.topic}\n\nTarget keywords: ${keywords}\n\nProvide:\n1. SEO title (max 60 chars)\n2. Meta description (max 160 chars)\n3. H1 heading\n4. Content outline with keyword placement suggestions\n5. Internal linking recommendations\n\nOutput format: ${input.outputFormat}`;
  }

  parseResponse(response: string): string {
    return response.trim();
  }
}
