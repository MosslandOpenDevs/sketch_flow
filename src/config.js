import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.string().optional(),
  FETCH_EVERY_MINUTES: z.string().optional(),
  MAX_ITEMS_PER_FETCH: z.string().optional(),
  FETCH_TOKEN: z.string().optional(),
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

/**
 * Parse a positive number from an env string, falling back when the value is
 * missing, non-numeric, or out of range. Prevents NaN from leaking into the
 * cron expression and other numeric consumers.
 */
export function toPositiveNumber(value, fallback, { min = 1, max = Infinity, integer = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return integer ? Math.floor(n) : n;
}

export const config = {
  port: toPositiveNumber(env.PORT, 3000, { min: 1, max: 65535, integer: true }),
  fetchEveryMinutes: toPositiveNumber(env.FETCH_EVERY_MINUTES, 60, { min: 1, integer: true }),
  // Cap the number of items summarized per fetch so a large first-run backlog
  // does not block for hours; the rest are picked up on the next cron tick.
  maxItemsPerFetch: toPositiveNumber(env.MAX_ITEMS_PER_FETCH, 25, { min: 1, integer: true }),
  // Optional shared secret. When set, POST /fetch requires a matching
  // `x-fetch-token` header, so a manual fetch cannot be triggered anonymously.
  fetchToken: env.FETCH_TOKEN ?? "",
  llmProvider: env.LLM_PROVIDER ?? "gemini",
  geminiApiKey: env.GEMINI_API_KEY ?? "",
  geminiModel: env.GEMINI_MODEL ?? "gemini-1.5-flash",
  lmstudio: {
    url: env.LMSTUDIO_URL ?? "http://localhost:1234/v1",
    model: env.LMSTUDIO_MODEL ?? "qwen2.5-32b-instruct",
    temperature: toPositiveNumber(env.LMSTUDIO_TEMPERATURE, 0.3, { min: 0, max: 2 }),
    maxTokens: toPositiveNumber(env.LMSTUDIO_MAX_TOKENS, 500, { min: 1 }),
    maxContextLength: toPositiveNumber(env.LMSTUDIO_MAX_CONTEXT_LENGTH, 8000, { min: 1 }),
    timeout: toPositiveNumber(env.LMSTUDIO_TIMEOUT, 120000, { min: 1000 }),
  },
};

/**
 * Build a valid cron expression for an "every N minutes" interval.
 * `*` /N in the minute field is only correct for N <= 59, and whole-hour
 * intervals must live in the hour field instead. Anything that cannot be
 * expressed cleanly falls back to hourly.
 */
export function buildCronExpression(minutes) {
  if (!Number.isFinite(minutes) || minutes < 1) return "0 * * * *";
  // Cron fields are integers; a fractional step (e.g. "*/1.5") is invalid.
  minutes = Math.floor(minutes);
  if (minutes < 60) return `*/${minutes} * * * *`;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours >= 24 ? "0 0 * * *" : `0 */${hours} * * *`;
  }
  // Non-divisor of 60 above an hour: round to nearest whole hour.
  const hours = Math.max(1, Math.round(minutes / 60));
  return `0 */${hours} * * *`;
}
