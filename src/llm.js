import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";

const SYSTEM_PROMPT = `당신은 개발 콘텐츠 요약 및 토론 생성기입니다.
출력은 반드시 JSON 한 덩어리로만 답하세요.
형식:
{
  "summary": { "ko": "...", "en": "..." },
  "discussion": { "ko": "...", "en": "..." }
}

요약은 3~5문장. 토론은 3명의 페르소나가 각각 주장하고, 마지막에 장점/단점/결론을 정리합니다.
토론이 필요 없는 경우 discussion은 빈 문자열로 주세요.`;

function extractJson(raw) {
  // ```json ... ``` 또는 ``` ... ``` 코드블록 제거
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // { ... } 블록 직접 추출
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return raw.slice(braceStart, braceEnd + 1);
  }

  return raw.trim();
}

function buildUserPrompt({ title, snippet, includeDiscussion }) {
  return `제목: ${title}
요약 대상 텍스트: ${snippet ?? ""}
토론 포함: ${includeDiscussion ? "예" : "아니오"}`;
}

async function callGemini({ title, snippet, includeDiscussion }) {
  if (!config.geminiApiKey) {
    return {
      model: "stub",
      summary: {
        ko: "GEMINI_API_KEY가 설정되지 않아 요약을 생성할 수 없습니다.",
        en: "GEMINI_API_KEY is not set, so summary is unavailable."
      },
      discussion: { ko: "", en: "" }
    };
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt({ title, snippet, includeDiscussion })}`;
  const result = await model.generateContent(prompt);
  return { model: config.geminiModel, raw: result.response.text() };
}

async function callLmStudio({ title, snippet, includeDiscussion }) {
  const { url, model, temperature, maxTokens, timeout } = config.lmstudio;
  console.log(`[lmstudio] POST ${url}/chat/completions (model: ${model}, temp: ${temperature}, max_tokens: ${maxTokens}, timeout: ${timeout}ms)`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt({ title, snippet, includeDiscussion }) }
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[lmstudio] API 에러 ${res.status}: ${body}`);
      throw new Error(`LM Studio API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    console.log(`[lmstudio] 응답 수신 (${raw.length}자, usage: ${JSON.stringify(data.usage ?? {})})`);
    return { model, raw };
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[lmstudio] 타임아웃 (${timeout}ms 초과)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function summarizeAndDiscuss({ title, snippet, includeDiscussion }) {
  const provider = config.llmProvider;
  let result;

  if (provider === "lmstudio") {
    result = await callLmStudio({ title, snippet, includeDiscussion });
  } else {
    result = await callGemini({ title, snippet, includeDiscussion });
  }

  // stub 응답은 그대로 반환
  if (result.model === "stub") {
    console.log(`[llm] stub 응답 반환 (API 키 미설정)`);
    return result;
  }

  // 마크다운 코드블록 제거 후 JSON 추출
  const jsonStr = extractJson(result.raw);

  try {
    const parsed = JSON.parse(jsonStr);
    console.log(`[llm] JSON 파싱 성공`);
    return {
      model: result.model,
      summary: parsed.summary ?? { ko: "", en: "" },
      discussion: parsed.discussion ?? { ko: "", en: "" }
    };
  } catch {
    console.warn(`[llm] JSON 파싱 실패, raw 텍스트로 반환 (${result.raw.slice(0, 100)}...)`);
    return {
      model: result.model,
      summary: { ko: result.raw, en: result.raw },
      discussion: { ko: "", en: "" }
    };
  }
}
