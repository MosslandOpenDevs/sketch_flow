# SketchFlow

RSS/피드를 1시간마다 수집하고, 3가지 카테고리로 분류합니다.
- 개발 아이디어
- 개발 이슈/논쟁
- 새 도구/제품

"개발 아이디어" 항목은 Gemini 모델로 페르소나 토론을 생성합니다.
요약/토론은 한글/영어 버전으로 저장됩니다.

## 기획 의도

- 여러 커뮤니티의 정보 과부하를 줄이고, **아이디어/이슈/도구** 관점으로 빠르게 스캔
- “개발 아이디어”를 중심으로 **장단점 토론**을 자동 생성해 의사결정을 돕기
- 프로토타입 단계에서 **가볍게 검증** 가능한 구조 유지 (JSON 저장 + 단순 FE)

## 시스템 구조

- 수집: `rss-parser`로 각 피드 폴링
- 분류: 키워드 기반 카테고리 분류
- 요약/토론: Gemini API로 한/영 요약과 토론 생성
- 저장: `data/items.json`
- 제공: Express API + 정적 FE

## 주요 기능

- 자동 수집: 기본 60분 주기 (서버 시작 시 1회 즉시 수집)
- 카테고리 분류
- Gemini 요약/토론 생성
- 간단 FE: 언어 토글, 요약 길이 토글, 검색/정렬/피드 필터, 페이지 크기
- 카드 확장: 클릭 시 토론 펼침, 토론 접기/펼치기 버튼

## 요구사항

- Node.js 18+

## 설치

```bash
npm install
```

## 환경 변수

`.env`를 만들고 `.env.example` 참고

```env
PORT=3000
FETCH_EVERY_MINUTES=60
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

## 실행

```bash
npm start
```

개발 모드:

```bash
npm run dev
```

## API

- `GET /health`
- `GET /feeds`
- `GET /items?category=개발%20아이디어`
- `POST /fetch`

## 프론트엔드

서버 실행 후 `http://localhost:3000` 접속

## 데이터 저장

- `data/items.json`

## 참고

- `data/`는 기본적으로 커밋에서 제외됩니다. 샘플은 `data/items.sample.json` 참고.
- 기존 데이터에 요약/토론 필드가 없으면 다시 수집해야 표시됩니다.
