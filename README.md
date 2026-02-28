# video-clipper (internal)

Phase 1 internal tool: paste a transcript, generate a "content pack" (chapters, key points, clip candidates, LinkedIn + X drafts).

## Setup

```bash
cd projects/video-clipper
export OPENAI_API_KEY="..."
# optional
export OPENAI_MODEL="gpt-4o-mini"

npm run dev
```

Open http://localhost:3000

## Notes
- Transcript is required (YouTube transcript fetch is intentionally not implemented yet; it’s flaky and often blocked).
- Output is JSON; download for reuse.
