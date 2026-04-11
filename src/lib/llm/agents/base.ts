export type ArtifactType = 'content' | 'seo' | 'code' | 'extraction';

export abstract class BaseAgent {
  abstract type: ArtifactType;

  abstract validateInput(input: unknown): Promise<void>;
  abstract buildPrompt(context: unknown): string;
  abstract parseResponse(response: string): unknown;
}
