import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.string().optional(),
  FETCH_EVERY_MINUTES: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

export const config = {
  port: Number(env.PORT ?? 3000),
  fetchEveryMinutes: Number(env.FETCH_EVERY_MINUTES ?? 60),
  geminiApiKey: env.GEMINI_API_KEY ?? "",
  geminiModel: env.GEMINI_MODEL ?? "gemini-1.5-flash",
};
