export interface GenerateRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface StreamChunk {
  token: string;
  done: boolean;
}

export interface LLMProvider {
  generateText(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk>;
}
