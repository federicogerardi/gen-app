import OpenAI from 'openai';
import { env } from '@/lib/env';
import type {
  LLMProvider,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
} from './base';

const client = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
  },
});

export class OpenRouterProvider implements LLMProvider {
  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await client.chat.completions.create({
      model: request.model,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }

  async *generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk> {
    const stream = await client.chat.completions.create({
      model: request.model,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      const done = chunk.choices[0]?.finish_reason != null;
      const usage = chunk.usage ? {
        inputTokens: chunk.usage.prompt_tokens ?? 0,
        outputTokens: chunk.usage.completion_tokens ?? 0,
      } : undefined;

      if (token || usage) {
        yield { token, done, usage };
      }
      if (done) break;
    }
  }
}
