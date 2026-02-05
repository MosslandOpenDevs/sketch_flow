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

export async function summarizeAndDiscuss({ title, snippet, includeDiscussion }) {
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

  const prompt = `${SYSTEM_PROMPT}

제목: ${title}
요약 대상 텍스트: ${snippet ?? ""}
토론 포함: ${includeDiscussion ? "예" : "아니오"}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  try {
    const parsed = JSON.parse(raw);
    return {
      model: config.geminiModel,
      summary: parsed.summary ?? { ko: "", en: "" },
      discussion: parsed.discussion ?? { ko: "", en: "" }
    };
  } catch {
    return {
      model: config.geminiModel,
      summary: { ko: raw, en: raw },
      discussion: { ko: "", en: "" }
    };
  }
}
