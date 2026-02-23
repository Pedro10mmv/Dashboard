import OpenAI from "openai";
import { AIProvider, AIGenerateOptions, AIGenerateResult } from "./provider";

export class OpenAIAdapter implements AIProvider {
  name = "openai";

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const client = new OpenAI({ apiKey: options.config.apiKey });
    const start = Date.now();

    const response = await client.chat.completions.create({
      model: options.config.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const latencyMs = Date.now() - start;
    const content = response.choices[0]?.message?.content || "{}";

    return {
      content,
      tokensInput: response.usage?.prompt_tokens,
      tokensOutput: response.usage?.completion_tokens,
      latencyMs,
    };
  }
}
