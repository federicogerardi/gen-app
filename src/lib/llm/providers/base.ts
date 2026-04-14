export interface GenerateRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

export interface GenerateResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface StreamChunk {
  token: string;
  done: boolean;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface LLMProvider {
  generateText(request: GenerateRequest): Promise<GenerateResponse>;
  generateStream(request: GenerateRequest): AsyncGenerator<StreamChunk>;
}
