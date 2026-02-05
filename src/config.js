import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.string().optional(),
  FETCH_EVERY_MINUTES: z.string().optional(),
  LLM_PROVIDER: z.enum(["gemini", "lmstudio"]).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  LMSTUDIO_URL: z.string().optional(),
  LMSTUDIO_MODEL: z.string().optional(),
  LMSTUDIO_TEMPERATURE: z.string().optional(),
  LMSTUDIO_MAX_TOKENS: z.string().optional(),
  LMSTUDIO_MAX_CONTEXT_LENGTH: z.string().optional(),
  LMSTUDIO_TIMEOUT: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

export const config = {
  port: Number(env.PORT ?? 3000),
  fetchEveryMinutes: Number(env.FETCH_EVERY_MINUTES ?? 60),
  llmProvider: env.LLM_PROVIDER ?? "gemini",
  geminiApiKey: env.GEMINI_API_KEY ?? "",
  geminiModel: env.GEMINI_MODEL ?? "gemini-1.5-flash",
  lmstudio: {
    url: env.LMSTUDIO_URL ?? "http://localhost:1234/v1",
    model: env.LMSTUDIO_MODEL ?? "qwen2.5-32b-instruct",
    temperature: Number(env.LMSTUDIO_TEMPERATURE ?? 0.3),
    maxTokens: Number(env.LMSTUDIO_MAX_TOKENS ?? 500),
    maxContextLength: Number(env.LMSTUDIO_MAX_CONTEXT_LENGTH ?? 8000),
    timeout: Number(env.LMSTUDIO_TIMEOUT ?? 700000),
  },
};
