import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment." },
        { status: 500 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const lang = form.get("lang");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file. Expected multipart/form-data with field 'file'." },
        { status: 400 },
      );
    }

    // Basic size guard (25MB default-ish; adjust as needed)
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error:
            "File too large for direct transcription. Export audio (mp3/m4a) and keep it under ~25MB, or we can add chunking later.",
        },
        { status: 413 },
      );
    }

    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

    const tr = await openai.audio.transcriptions.create({
      file,
      model,
      language: typeof lang === "string" && lang ? lang : undefined,
      response_format: "verbose_json",
    });

    type Segment = { start?: number; text?: string };
    type Verbose = { text?: string; segments?: Segment[] };
    const v = tr as unknown as Verbose;

    // verbose_json has: text, segments[{start,end,text}], etc.
    const transcript =
      Array.isArray(v.segments) && v.segments.length
        ? v.segments
            .map((s) => {
              const start = typeof s.start === "number" ? s.start : 0;
              const m = Math.floor(start / 60);
              const sec = Math.floor(start % 60);
              const ts = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
              const text = String(s.text || "").replace(/\s+/g, " ").trim();
              return `${ts} ${text}`;
            })
            .join("\n")
        : String(v.text || "");

    return NextResponse.json({ transcript, meta: { model, bytes: file.size } });
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? String((err as { message?: unknown }).message)
        : "Failed to transcribe.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
