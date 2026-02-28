import { NextResponse } from "next/server";
import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";

export const runtime = "nodejs";

const BodySchema = z.object({
  url: z.string().url(),
  lang: z.string().optional(),
});

function hhmmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { url, lang } = BodySchema.parse(json);

    const items = await YoutubeTranscript.fetchTranscript(url, {
      lang: lang || "en",
    });

    // Convert to a compact, copy/paste-friendly transcript with timestamps.
    // Example line: 03:12 Some text...
    const transcript = items
      .map((it: { offset?: number; text?: string }) => {
        const t = typeof it.offset === "number" ? hhmmss(it.offset / 1000) : "";
        const text = String(it.text || "").replace(/\s+/g, " ").trim();
        return t ? `${t} ${text}` : text;
      })
      .filter(Boolean)
      .join("\n");

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        { error: "Transcript was empty/unavailable for this video." },
        { status: 404 },
      );
    }

    return NextResponse.json({ transcript, count: items.length });
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? String((err as { message?: unknown }).message)
        : "Failed to fetch transcript. This video may not have captions or YouTube blocked the request.";

    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
