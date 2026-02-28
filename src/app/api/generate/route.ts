import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  transcript: z.string().min(200, "Transcript is too short.").max(200_000),
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment." },
        { status: 500 },
      );
    }

    const json = await req.json();
    const { url, transcript } = BodySchema.parse(json);

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system =
      "You turn long-form video transcripts into a structured content pack. Be accurate; do not invent claims. Use only info present in the transcript.";

    const prompt = `INPUT\nURL: ${url || "(none)"}\n\nTRANSCRIPT:\n"""\n${transcript}\n"""\n\nTASK\nReturn a JSON object with:\n- title: string (best guess from transcript, or empty)\n- key_points: array of 10-20 bullets (short, specific)\n- chapters: array of 6-12 items { time: "MM:SS" or "HH:MM:SS" (best effort), title: string }\n- clips: array of 12-20 items { start: time string, end: time string, hook: string (1 line), caption: string (1-2 lines), why: string (short) }\n- posts: { linkedin: string[5], x: string[10] }\n\nRules:\n- If transcript has no timestamps, set time/start/end to "".\n- Hooks must be punchy but not clickbait.\n- Keep LinkedIn posts < 1200 chars; X posts < 280 chars.\n- Output MUST be valid JSON, no markdown.`;

    const resp = await openai.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const text = resp.output_text;
    // Basic sanity: try parse.
    const data = JSON.parse(text);

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? String((err as { message?: unknown }).message)
        : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
