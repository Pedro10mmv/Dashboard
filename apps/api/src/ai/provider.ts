export interface AIProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export interface AIGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  config: AIProviderConfig;
}

export interface AIGenerateResult {
  content: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs: number;
}

export interface AIProvider {
  name: string;
  generate(options: AIGenerateOptions): Promise<AIGenerateResult>;
}
