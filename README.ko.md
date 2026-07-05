# SketchFlow

[English](README.md) · **한국어**

RSS/피드를 일정 주기로 수집하고, 3가지 카테고리로 분류합니다.
- 개발 아이디어
- 개발 이슈/논쟁
- 새 도구/제품

"개발 아이디어" 항목은 추가로 장단점 페르소나 토론을 생성합니다.
요약/토론은 LLM으로 생성되며 한글/영어 버전으로 저장됩니다.

## 기획 의도

- 여러 커뮤니티의 정보 과부하를 줄이고, **아이디어 / 이슈 / 도구** 관점으로 빠르게 스캔
- "개발 아이디어"를 중심으로 **장단점 토론**을 자동 생성해 의사결정을 돕기
- 프로토타입 단계에서 **가볍게 검증** 가능한 구조 유지 (JSON 저장 + 단순 FE)

## 시스템 구조

- **수집**: `rss-parser`로 각 피드 폴링
- **분류**: 키워드 기반 카테고리 분류 (`src/categorize.js`)
- **요약/토론**: LLM 제공자가 한/영 요약과 토론 생성 — `LLM_PROVIDER`로 선택
  - `gemini` — Google Gemini API
  - `lmstudio` — 로컬 OpenAI 호환 LM Studio 엔드포인트
- **저장**: `data/items.json` (원자적 쓰기, 최대 500개 유지)
- **제공**: Express API + 정적 FE

## 주요 기능

- 설정 가능한 주기로 자동 수집 (서버 시작 시 1회 즉시 수집)
- 한 번의 수집에서 최대 `MAX_ITEMS_PER_FETCH`개만 요약 — 첫 실행에 항목이 많아도
  오래 멈추지 않고, 나머지는 다음 주기에 이어서 수집
- 키워드 카테고리 분류
- LLM 요약/토론 생성 (Gemini 또는 LM Studio)
- 간단 FE: 언어 토글, 요약 길이 토글, 검색 / 정렬 / 피드 필터, 페이지 크기
- 카드 확장: 클릭 시 펼침, 토론 접기/펼치기 (다시 그려도 상태 유지)
- 피드/LLM 콘텐츠는 렌더링 시 모두 HTML 이스케이프 (저장형 XSS 방지)

## 요구사항

- Node.js 18+

## 설치

```bash
npm install
```

## 환경 변수

`.env`를 만들고 `.env.example`를 참고하세요.

```env
PORT=3000
FETCH_EVERY_MINUTES=60         # 60을 나누어떨어지는 값 권장 (예: 15, 30, 60)
MAX_ITEMS_PER_FETCH=25         # 한 번의 수집에서 요약할 최대 항목 수
FETCH_TOKEN=                   # 설정 시 POST /fetch 호출에 x-fetch-token 헤더 필요

# LLM_PROVIDER로 요약기 선택: "gemini"(기본) 또는 "lmstudio"
LLM_PROVIDER=gemini

# Gemini (LLM_PROVIDER=gemini). 키가 없어도 서버는 실행되며 요약 자리에
# 안내 문구가 채워집니다.
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# LM Studio (LLM_PROVIDER=lmstudio) — 로컬 OpenAI 호환 서버
LMSTUDIO_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=qwen2.5-32b-instruct
LMSTUDIO_TEMPERATURE=0.3
LMSTUDIO_MAX_TOKENS=500
LMSTUDIO_MAX_CONTEXT_LENGTH=8000
LMSTUDIO_TIMEOUT=120000
```

> 스케줄 참고: `FETCH_EVERY_MINUTES`는 cron 표현식으로 변환됩니다. 60 미만은 분 단위
> 스텝(`*/N * * * *`), 정시(시간 단위)는 시(hour) 필드를 사용하고, 그 외 1시간을 넘는
> 값은 가장 가까운 시간으로 반올림됩니다.

## 실행

```bash
npm start
```

개발 모드 (자동 재시작):

```bash
npm run dev
```

## 테스트

```bash
npm test
```

## API

- `GET /health`
- `GET /feeds`
- `GET /items` — 전체 항목
- `GET /items?category=개발%20아이디어` — 카테고리 필터 (값은 위 3개의 한글
  카테고리 문자열이며 정확히 일치해야 함)
- `POST /fetch` — 지금 수집 실행 (`FETCH_TOKEN` 설정 시 `x-fetch-token` 헤더 필요)

## 프론트엔드

서버 실행 후 `http://localhost:3000` 접속

## 데이터 저장

- `data/items.json` — 실제 데이터 (git 제외)
- `data/items.sample.json` — 항목 형태를 보여주는 커밋된 샘플

## 참고

- `data/`의 실제 데이터는 커밋에서 제외되고, `data/items.sample.json`만 추적됩니다.
- 기존 데이터에 요약/토론 필드가 없으면 다시 수집해야 표시됩니다.
- `FETCH_TOKEN`이 설정되어 있으면, 웹 UI의 "지금 수집" 버튼이 토큰을 한 번 입력받아
  브라우저(`localStorage`)에 기억합니다.
- 단일 운영자용 로컬 대시보드입니다. 선택적 `FETCH_TOKEN` 외 인증이 없으므로,
  신뢰할 수 없는 네트워크에 그대로 노출하지 마세요.

## 향후 방향 (Roadmap)

이 저장소는 의도적으로 작고, 파일 기반이며, 단일 운영자를 전제로 한 **동작하는
프로토타입**입니다. 완성품이라기보다 그 위에 쌓아 올릴 **토대**로 보면 좋습니다.
다음과 같은 방향을 열어 둡니다.

- **더 똑똑한 분류.** 현재 분류는 키워드 기반이며 한/영에 한정됩니다. 임베딩·LLM
  기반 분류(신뢰도 점수, 사용자 정의 카테고리)로 가면 뉘앙스와 새로운 주제를 훨씬
  잘 다룰 수 있습니다.
- **실제 데이터스토어.** `data/items.json`은 이해하기 쉽지만 500개 상한에 인덱싱이
  없습니다. SQLite/Postgres로 전환하면 전문 검색, 정규화된 URL 기반 중복 제거,
  보관 정책, 안전한 동시 접근이 가능해집니다.
- **견고한 LLM 파이프라인.** 지금은 호출이 순차적입니다. 제한된 동시성, 백오프
  재시도, 응답 캐싱, 더 엄격한 출력 검증/새니타이즈(프롬프트 인젝션 심층 방어)로
  수집을 더 빠르고 안전하게 만들 수 있습니다. 임베딩으로 유사 항목 클러스터링도
  가능합니다.
- **사용자 관리형 피드.** 피드는 `src/feeds.js`에 하드코딩되어 있습니다. UI에서
  피드를 추가/삭제(OPML 가져오기, 피드별 규칙)할 수 있게 하면 재사용성이 커집니다.
- **풍부한 프론트엔드.** 바닐라 JS FE는 의도적으로 최소한입니다. 읽음/안읽음 상태,
  즐겨찾기, 실시간 갱신(SSE/WebSocket), 테마가 자연스러운 다음 단계이며, 규모가
  커지면 가벼운 프레임워크 도입도 고려할 만합니다.
- **운영 준비도.** 정식 인증과 멀티유저, 레이트리밋, 컨테이너화, CI(푸시마다
  `npm test` + `npm audit` 실행)를 갖추면 "내 컴퓨터에서 됨"에서 "배포 가능"으로
  나아갑니다.

기여와 포크를 환영합니다 — 지금 코드는 제약이 아니라 **출발점**으로 삼아 주세요.
