# SketchFlow

Collects RSS feeds every hour and classifies them into three categories:
- Dev Ideas
- Dev Issues/Controversies
- New Tools/Products

Items in "Dev Ideas" trigger a Gemini persona discussion.
Summaries and discussions are stored in both Korean and English.

## Product Intent

- Reduce information overload by clustering items into **ideas/issues/tools**
- Auto-generate pros/cons discussions for **Dev Ideas** to support decisions
- Keep it lightweight and prototype-friendly (JSON storage + minimal FE)

## System Architecture

- Fetch: poll RSS feeds via `rss-parser`
- Classify: keyword-based categorization
- Summarize/Discuss: Gemini API produces KR/EN outputs
- Store: `data/items.json`
- Serve: Express API + static FE

## Features

- Auto fetch: default every 60 minutes (also runs once at startup)
- Category classification
- Gemini summary + discussion
- Minimal FE: language toggle, summary length toggle, search/sort/source filter, page size
- Expandable cards with discussion collapse/expand

## Requirements

- Node.js 18+

## Install

```bash
npm install
```

## Environment

Create `.env` based on `.env.example`

```env
PORT=3000
FETCH_EVERY_MINUTES=60
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

## Run

```bash
npm start
```

Dev mode:

```bash
npm run dev
```

## API

- `GET /health`
- `GET /feeds`
- `GET /items?category=Dev%20Ideas`
- `POST /fetch`

## Frontend

Open `http://localhost:3000` after server starts.

## Data Storage

- `data/items.json`

## Notes

- `data/` is excluded from commits by default. See `data/items.sample.json` for a sample.
- If existing data lacks summary/discussion fields, re-fetch to populate them.
