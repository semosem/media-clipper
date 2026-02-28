"use client";

import { useMemo, useState } from "react";

type Pack = {
  title?: string;
  key_points?: string[];
  chapters?: { time: string; title: string }[];
  clips?: { start: string; end: string; hook: string; caption: string; why: string }[];
  posts?: { linkedin: string[]; x: string[] };
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Pack | null>(null);

  const transcriptStats = useMemo(() => {
    const chars = transcript.length;
    const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [transcript]);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setData(json.data);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
          ? String((e as { message?: unknown }).message)
          : "Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function downloadJson() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `content-pack-${(data.title || "video").slice(0, 40).replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#23485f] via-[#1e3951] to-[#131e31] text-zinc-50">
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Video Clipper (internal)</h1>
          <p className="mt-2 text-sm text-white/70">
            Paste a transcript → generate a content pack (chapters, clips, hooks, posts). No clipping yet—Phase 1.
          </p>
        </div>

        <div className="grid gap-6">
          <section className="rounded-xl border border-white/10 bg-black/20 p-5 shadow-sm backdrop-blur">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">YouTube URL (optional)</span>
                <input
                  className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-black dark:focus:ring-zinc-700"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-medium">Transcript (required)</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {transcriptStats.words.toLocaleString()} words · {transcriptStats.chars.toLocaleString()} chars
                  </span>
                </div>
                <textarea
                  className="min-h-[220px] resize-y rounded-lg border border-zinc-200 bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-800 dark:bg-black dark:focus:ring-zinc-700"
                  placeholder="Paste transcript here…"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onGenerate}
                  disabled={loading || transcript.trim().length < 200}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[#23485f] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1e3951] disabled:opacity-50"
                >
                  {loading ? "Generating…" : "Generate pack"}
                </button>

                <button
                  onClick={downloadJson}
                  disabled={!data}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-black/10 px-4 text-sm font-medium text-white disabled:opacity-50 hover:bg-black/20"
                >
                  Download JSON
                </button>

                {error ? (
                  <p className="text-sm text-red-200">{error}</p>
                ) : null}
              </div>
            </div>
          </section>

          {data ? (
            <section className="rounded-xl border border-white/10 bg-black/20 p-5 shadow-sm backdrop-blur">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Output</h2>
                {data.title ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{data.title}</p>
                ) : null}
              </div>

              <div className="grid gap-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Key points
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {(data.key_points || []).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Chapters
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {(data.chapters || []).map((c, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-[72px] shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {c.time || ""}
                        </span>
                        <span>{c.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Clip candidates
                  </h3>
                  <div className="mt-2 grid gap-3">
                    {(data.clips || []).map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{c.start || ""}</span>
                          <span>→</span>
                          <span className="font-mono">{c.end || ""}</span>
                        </div>
                        <div className="font-medium">{c.hook}</div>
                        <div className="mt-1 text-zinc-700 dark:text-zinc-300">{c.caption}</div>
                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{c.why}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      LinkedIn (5)
                    </h3>
                    <div className="mt-2 grid gap-3">
                      {(data.posts?.linkedin || []).map((p, i) => (
                        <pre
                          key={i}
                          className="whitespace-pre-wrap rounded-lg border border-zinc-200 p-3 text-xs leading-5 dark:border-zinc-800"
                        >
                          {p}
                        </pre>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      X (10)
                    </h3>
                    <div className="mt-2 grid gap-3">
                      {(data.posts?.x || []).map((p, i) => (
                        <pre
                          key={i}
                          className="whitespace-pre-wrap rounded-lg border border-zinc-200 p-3 text-xs leading-5 dark:border-zinc-800"
                        >
                          {p}
                        </pre>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              Setup: export <code className="font-mono">OPENAI_API_KEY</code> (optional: <code className="font-mono">OPENAI_MODEL</code>). Run:
              <code className="ml-2 font-mono">npm run dev</code>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
