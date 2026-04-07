import { z } from 'zod';
import { BaseAgent } from './base';

const CodeInputSchema = z.object({
  description: z.string().min(5),
  language: z.string().default('typescript'),
  framework: z.string().optional(),
  style: z.enum(['minimal', 'documented', 'production']).default('production'),
});

export type CodeInput = z.infer<typeof CodeInputSchema>;

export class CodeAgent extends BaseAgent {
  type = 'code' as const;

  async validateInput(input: unknown): Promise<void> {
    CodeInputSchema.parse(input);
  }

  buildPrompt(context: unknown): string {
    const input = CodeInputSchema.parse(context);
    const frameworkNote = input.framework ? ` using ${input.framework}` : '';
    return `You are an expert software engineer.\n\nGenerate ${input.style} ${input.language} code${frameworkNote}.\n\nTask: ${input.description}\n\nRequirements:\n- Production-ready code\n- Follow best practices for ${input.language}${frameworkNote}\n- ${input.style === 'documented' || input.style === 'production' ? 'Include relevant comments' : 'Minimal comments'}\n\nReturn only the code without explanations unless comments are required.`;
  }

  parseResponse(response: string): string {
    // Strip markdown code fences if present
    return response.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }
}
