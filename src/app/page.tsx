"use client";

import { useMemo, useState } from "react";

function getYouTubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // /shorts/<id> or /embed/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "shorts" || p === "embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}


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
  const [fetching, setFetching] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Pack | null>(null);

  const transcriptStats = useMemo(() => {
    const chars = transcript.length;
    const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [transcript]);

  const youtubeId = useMemo(() => getYouTubeId(url.trim()), [url]);

  async function onFetchTranscript() {
    if (!url.trim()) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch transcript");
      setTranscript(json.transcript);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
          ? String((e as { message?: unknown }).message)
          : "Failed to fetch transcript";
      setError(msg);
    } finally {
      setFetching(false);
    }
  }

  async function onTranscribeFile(file: File) {
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Transcription failed");
      setTranscript(json.transcript);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
          ? String((e as { message?: unknown }).message)
          : "Transcription failed";
      setError(msg);
    } finally {
      setTranscribing(false);
    }
  }

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
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Content Pack Generator</span>
              </div>
              <div className="hidden items-center gap-2 text-xs text-white/60 md:flex">
                <span className="rounded-full bg-white/10 px-3 py-1">48h turnaround</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Clips + posts</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Async</span>
              </div>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Turn 1 long video into <span className="text-emerald-200">15 clips</span> + a week of posts.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Paste a transcript (or add a YouTube URL) and generate chapters, clip candidates, hooks, captions, and LinkedIn/X drafts. This started as an
              internal tool — we’re packaging it as a paid service.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a
                href="#try"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-400/90 px-4 text-sm font-semibold text-black shadow-sm hover:bg-emerald-300"
              >
                Try the generator
              </a>
              <a
                href="#service"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-black/10 px-4 text-sm font-semibold text-white hover:bg-black/20"
              >
                See the 48h service
              </a>
              <span className="text-xs text-white/60">No calls. Async delivery via Google Doc + JSON.</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Clip Map</div>
              <p className="mt-1 text-sm text-white/70">12–20 timestamped moments with hooks + captions.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Chapters</div>
              <p className="mt-1 text-sm text-white/70">Clean structure for YouTube + repurposing.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold">Posts</div>
              <p className="mt-1 text-sm text-white/70">5 LinkedIn drafts + 10 X drafts from the same content.</p>
            </div>
          </section>

          <section id="try" className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-sm backdrop-blur">
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Try it</h2>
                  <p className="mt-1 text-sm text-white/70">Paste a transcript and generate your content pack.</p>
                </div>
                <div className="hidden text-xs text-white/60 md:block">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Internal tool → Service</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-5">
                <div className="grid gap-2 md:col-span-3">
                  <div className="flex items-end justify-between gap-3">
                    <span className="text-sm font-medium text-white/80">YouTube URL (optional)</span>
                    <button
                      type="button"
                      onClick={onFetchTranscript}
                      disabled={!youtubeId || fetching}
                      className="text-xs font-semibold text-emerald-200 hover:text-emerald-100 disabled:opacity-50"
                    >
                      {fetching ? "Fetching transcript…" : "Fetch transcript"}
                    </button>
                  </div>
                  <input
                    className="h-11 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-300/40"
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="text-xs text-white/50">
                    Works when the video has captions. If it fails, upload an audio/video file below and we’ll transcribe it.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-white/80">Preview</div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    {youtubeId ? (
                      <div className="aspect-video">
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                          title="YouTube preview"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : url.trim() ? (
                      <div className="flex aspect-video items-center justify-center p-4 text-center text-xs text-white/60">
                        Paste a valid YouTube link to show a preview.
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center p-4 text-center text-xs text-white/60">
                        Add a link to preview the video here.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white/80">Transcript (required)</div>
                    <div className="mt-1 text-xs text-white/50">
                      {transcriptStats.words.toLocaleString()} words · {transcriptStats.chars.toLocaleString()} chars
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30">
                    <input
                      type="file"
                      className="hidden"
                      accept="audio/*,video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onTranscribeFile(f);
                        // allow selecting same file again
                        e.currentTarget.value = "";
                      }}
                      disabled={transcribing}
                    />
                    <span>{transcribing ? "Transcribing…" : "Upload file → Transcribe"}</span>
                    <span className="text-white/40">(mp3/m4a/mp4)</span>
                  </label>
                </div>

                <textarea
                  className="min-h-[240px] resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-300/40"
                  placeholder="Paste transcript here…"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />

                <p className="text-xs text-white/50">
                  Tip: exporting audio first (mp3/m4a) is faster/cheaper than uploading full video.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onGenerate}
                  disabled={loading || transcript.trim().length < 200}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-400/90 px-4 text-sm font-semibold text-black shadow-sm hover:bg-emerald-300 disabled:opacity-50"
                >
                  {loading ? "Generating…" : "Generate pack"}
                </button>

                <button
                  onClick={downloadJson}
                  disabled={!data}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-black/10 px-4 text-sm font-semibold text-white disabled:opacity-50 hover:bg-black/20"
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
            <section className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-sm backdrop-blur">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Output</h2>
                {data.title ? (
                  <p className="mt-1 text-sm text-white/70">{data.title}</p>
                ) : null}
              </div>

              <div className="grid gap-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">Key points</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/90">
                    {(data.key_points || []).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">Chapters</h3>
                  <ul className="mt-2 space-y-1 text-sm text-white/90">
                    {(data.chapters || []).map((c, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-[72px] shrink-0 font-mono text-xs text-white/50">{c.time || ""}</span>
                        <span>{c.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">Clip candidates</h3>
                  <div className="mt-2 grid gap-3">
                    {(data.clips || []).map((c, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                          <span className="font-mono">{c.start || ""}</span>
                          <span>→</span>
                          <span className="font-mono">{c.end || ""}</span>
                        </div>
                        <div className="font-medium">{c.hook}</div>
                        <div className="mt-1 text-white/80">{c.caption}</div>
                        <div className="mt-2 text-xs text-white/50">{c.why}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">LinkedIn (5)</h3>
                    <div className="mt-2 grid gap-3">
                      {(data.posts?.linkedin || []).map((p, i) => (
                        <pre
                          key={i}
                          className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/10 p-4 text-xs leading-5 text-white/85"
                        >
                          {p}
                        </pre>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">X (10)</h3>
                    <div className="mt-2 grid gap-3">
                      {(data.posts?.x || []).map((p, i) => (
                        <pre
                          key={i}
                          className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/10 p-4 text-xs leading-5 text-white/85"
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

          <section id="service" className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">48h Content Pack Service</h2>
                <p className="mt-1 text-sm text-white/70">
                  You send a video link (or file). We deliver a polished content pack + clip map. No calls.
                </p>
              </div>
              <a
                href="mailto:semosem@proton.me?subject=48h%20Content%20Pack%20Service&body=Video%20link%3A%20%0APlatform%20(YouTube%2FPodcast%2FOther)%3A%20%0AGoal%3A%20(Shorts%2FLinkedIn%2FLaunch)%0AAudience%3A%20%0A"
                className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-400/90 px-4 text-sm font-semibold text-black hover:bg-emerald-300 md:mt-0"
              >
                Request a pack
              </a>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold">Starter</div>
                <div className="mt-1 text-2xl font-semibold">€99</div>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>• Key points + chapters</li>
                  <li>• 12 clip candidates (hooks + captions)</li>
                  <li>• 5 LinkedIn + 10 X drafts</li>
                </ul>
              </div>
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4">
                <div className="text-sm font-semibold">Pro</div>
                <div className="mt-1 text-2xl font-semibold">€199</div>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>• Everything in Starter</li>
                  <li>• 20 clip candidates + better hooks</li>
                  <li>• 1 revision round</li>
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold">Done-for-you Clips</div>
                <div className="mt-1 text-2xl font-semibold">€399+</div>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>• 5–15 edited shorts</li>
                  <li>• Captions + basic branding</li>
                  <li>• Upload-ready exports</li>
                </ul>
              </div>
            </div>

            <p className="mt-5 text-xs text-white/50">
              Tip: the fastest way to start is to send 1 video. If you like the output, we move to a weekly batch.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs text-white/55">
            <p>
              Dev setup: export <code className="font-mono text-white/80">OPENAI_API_KEY</code> (optional: <code className="font-mono text-white/80">OPENAI_MODEL</code>), then run
              <code className="ml-2 font-mono text-white/80">npm run dev</code>
            </p>
          </section>

          <footer className="py-2 text-center text-xs text-white/40">
            Built with Next.js + TypeScript. Internal tool evolving into a productized service.
          </footer>
        </div>
      </main>
    </div>
  );
}
