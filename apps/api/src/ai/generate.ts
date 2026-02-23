import crypto from "crypto";
import { ZodSchema } from "zod";
import { AIProvider, AIProviderConfig } from "./provider";
import { OpenAIAdapter } from "./openai";
import prisma from "../lib/prisma";

const providers: Record<string, AIProvider> = {
  openai: new OpenAIAdapter(),
};

function getProvider(name: string): AIProvider {
  const p = providers[name];
  if (!p) throw new Error(`Unknown AI provider: ${name}`);
  return p;
}

function hashInput(input: unknown): string {
  const serialized = JSON.stringify(
    input,
    Object.keys(input as Record<string, unknown>).sort()
  );
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

interface GenerateJSONOptions<T> {
  agentId: string;
  profileId: string;
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  input: unknown;
  schema: ZodSchema<T>;
  providerOverride?: string;
  modelOverride?: string;
}

export async function generateJSON<T>(
  options: GenerateJSONOptions<T>
): Promise<{
  result: T;
  aiRunId: string;
  cached: boolean;
}> {
  const inputHash = hashInput(options.input);

  // Check cache: same agentId + inputHash + success within 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cached = await prisma.aiRun.findFirst({
    where: {
      agentId: options.agentId,
      inputHash,
      status: "success",
      createdAt: { gte: twentyFourHoursAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (cached && cached.resultJson) {
    const parsed = options.schema.safeParse(cached.resultJson);
    if (parsed.success) {
      return { result: parsed.data, aiRunId: cached.id, cached: true };
    }
  }

  // Resolve provider config
  const providerName =
    options.providerOverride || process.env.AI_PROVIDER_DEFAULT || "openai";
  const model =
    options.modelOverride || process.env.AI_MODEL_DEFAULT || "gpt-4o-mini";
  const apiKey = process.env.OPENAI_API_KEY || "";

  const config: AIProviderConfig = { provider: providerName, model, apiKey };
  const provider = getProvider(providerName);

  // Create pending ai_run
  const aiRun = await prisma.aiRun.create({
    data: {
      profileId: options.profileId,
      agentId: options.agentId,
      provider: providerName,
      model,
      promptVersion: options.promptVersion,
      inputHash,
      inputJson: JSON.parse(JSON.stringify(options.input)),
      status: "pending",
    },
  });

  let lastError: Error | null = null;

  // Try up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const aiResult = await provider.generate({
        systemPrompt:
          options.systemPrompt +
          "\n\nYou MUST respond with valid JSON matching the required schema. No markdown, no code fences, just JSON.",
        userPrompt: options.userPrompt,
        config,
      });

      const parsed = JSON.parse(aiResult.content);
      const validated = options.schema.safeParse(parsed);

      if (validated.success) {
        await prisma.aiRun.update({
          where: { id: aiRun.id },
          data: {
            status: "success",
            resultJson: JSON.parse(JSON.stringify(validated.data)),
            tokensInput: aiResult.tokensInput,
            tokensOutput: aiResult.tokensOutput,
            latencyMs: aiResult.latencyMs,
          },
        });

        return { result: validated.data, aiRunId: aiRun.id, cached: false };
      }

      lastError = new Error(
        `Zod validation failed: ${JSON.stringify(validated.error.errors)}`
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // Both attempts failed
  await prisma.aiRun.update({
    where: { id: aiRun.id },
    data: {
      status: "error",
      errorMessage: lastError?.message || "Unknown error",
    },
  });

  throw new Error(
    `AI generation failed after 2 attempts: ${lastError?.message}`
  );
}

export async function getProviderConfig(
  profileId: string,
  agentId: string
): Promise<{
  provider: string;
  model: string;
}> {
  const agentSetting = await prisma.profileAgentSetting.findUnique({
    where: { profileId_agentId: { profileId, agentId } },
  });

  return {
    provider:
      agentSetting?.provider || process.env.AI_PROVIDER_DEFAULT || "openai",
    model: agentSetting?.model || process.env.AI_MODEL_DEFAULT || "gpt-4o-mini",
  };
}

export async function isAgentEnabled(
  profileId: string,
  agentId: string
): Promise<boolean> {
  const setting = await prisma.profileAgentSetting.findUnique({
    where: { profileId_agentId: { profileId, agentId } },
  });
  return setting?.enabled !== false; // default enabled
}
