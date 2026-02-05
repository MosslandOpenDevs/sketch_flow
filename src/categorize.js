const CATEGORIES = [
  "개발 아이디어",
  "개발 이슈/논쟁",
  "새 도구/제품"
];

const ideaKeywords = [
  "idea", "proposal", "concept", "experiment", "explore",
  "design", "architecture", "workflow", "pattern", "research",
  "아이디어", "제안", "실험", "개념", "설계", "아키텍처"
];

const issueKeywords = [
  "controversy", "debate", "issue", "bug", "outage", "vulnerability",
  "lawsuit", "ban", "policy", "license", "regulation", "security",
  "논쟁", "이슈", "버그", "장애", "취약점", "보안", "정책", "라이선스"
];

const toolKeywords = [
  "release", "launch", "tool", "framework", "library", "sdk",
  "product", "platform", "beta", "v1", "v2", "update",
  "도구", "프레임워크", "라이브러리", "제품", "플랫폼", "출시", "업데이트"
];

export function categorizeItem(item) {
  const text = `${item.title} ${item.contentSnippet ?? ""}`.toLowerCase();

  const ideaScore = score(text, ideaKeywords);
  const issueScore = score(text, issueKeywords);
  const toolScore = score(text, toolKeywords);

  const max = Math.max(ideaScore, issueScore, toolScore);
  if (max === 0) return "개발 아이디어";
  if (max === issueScore) return "개발 이슈/논쟁";
  if (max === toolScore) return "새 도구/제품";
  return "개발 아이디어";
}

function score(text, keywords) {
  return keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
}

export { CATEGORIES };
