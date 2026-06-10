"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import InsufficientCreditsDialog from "@/components/credits/InsufficientCreditsDialog";
import { chargePost, refundRender } from "@/app/actions/charge-render";

type Step = "input" | "processing" | "results";
type CloneMode = "exact" | "fresh";

interface SlideData {
  original_name: string;
  mime_type: string;
  data_b64: string;
}

interface CloneResult {
  index: number;
  cloned_url: string;
  original_url: string;
  quality: string;
}

interface JobStatus {
  job_id: string;
  status: string;
  current_step: string;
  total_slides: number;
  completed_slides: number;
  error: string | null;
}

interface JobResult {
  job_id: string;
  status: string;
  results: CloneResult[];
  rewritten_caption: string | null;
}

export default function PostClonerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("input");
  const [files, setFiles] = useState<File[]>([]);
  const [cloneMode, setCloneMode] = useState<CloneMode>("exact");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<{ needed: number; balance: number } | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [editPrompts, setEditPrompts] = useState<Record<number, string>>({});
  const [editingSlide, setEditingSlide] = useState<number | null>(null);

  const downloadSlide = (url: string, slideIndex: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloned_slide_${slideIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(png|jpe?g|webp)$/i.test(f.name)
    );
    if (dropped.length > 0) {
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}_${f.size}`));
        const unique = dropped.filter((f) => !existing.has(`${f.name}_${f.size}`));
        return [...prev, ...unique];
      });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}_${f.size}`));
        const unique = selected.filter((f) => !existing.has(`${f.name}_${f.size}`));
        return [...prev, ...unique];
      });
    }
    e.target.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const startClone = async (slides: SlideData[]) => {
    setError(null);

    // RECONCILE GAP: this charge has no library item until the clone succeeds, so
    // the reconcile cron can't anchor on it. If the job dies mid-flight after the
    // user navigates away, only the failure paths below refund. Closing this needs
    // a server-side pending-charge record. See project_credit_billing.md KNOWN GAP.
    const chargeKey = `clone-charge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const charge = await chargePost({ jobId: chargeKey, format: "post_cloner" });
    if (!charge.ok) {
      if (charge.error === "insufficient_credits") {
        setCreditError({ needed: charge.needed, balance: charge.balance });
      } else {
        setError("Please sign in to clone.");
      }
      setStep("input");
      return;
    }

    setStep("processing");
    setJobStatus({ job_id: "", status: "processing", current_step: "Starting...", total_slides: slides.length, completed_slides: 0, error: null });

    try {
      const startRes = await fetch("/api/clone-post/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, clone_mode: cloneMode, caption }),
      });

      if (!startRes.ok) {
        const text = await startRes.text();
        let msg = "Failed to start clone";
        try { msg = JSON.parse(text).error || msg; } catch {}
        throw new Error(msg);
      }

      const { job_id } = await startRes.json();

      const poll = async () => {
        const statusRes = await fetch(`/api/clone-post/status?jobId=${job_id}`);
        if (!statusRes.ok) throw new Error("Failed to check status");
        const status: JobStatus = await statusRes.json();
        setJobStatus(status);

        if (status.status === "done") {
          const resultRes = await fetch(`/api/clone-post/result?jobId=${job_id}`);
          if (!resultRes.ok) throw new Error("Failed to fetch results");
          const result: JobResult = await resultRes.json();
          setJobResult(result);
          setStep("results");
        } else if (status.status === "failed") {
          refundRender({ jobId: chargeKey }).catch((e) => console.error("refundRender call failed:", e));
          setError(status.error || "Clone failed");
          setStep("input");
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);
    } catch (e) {
      refundRender({ jobId: chargeKey }).catch((er) => console.error("refundRender call failed:", er));
      setError(e instanceof Error ? e.message : "Clone failed");
      setStep("input");
    }
  };

  const handleStart = async () => {
    if (files.length === 0) return;
    setError(null);
    try {
      const slides: SlideData[] = await Promise.all(
        files.map(async (f) => ({
          original_name: f.name,
          mime_type: f.type || "image/png",
          data_b64: await fileToBase64(f),
        }))
      );
      await startClone(slides);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process files");
    }
  };

  const handleSaveToLibrary = async () => {
    if (!jobResult) return;
    setSaving(true);
    try {
      for (const result of jobResult.results) {
        await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: `clone-${jobResult.job_id}-${result.index}`,
            title: `Cloned Post — Slide ${result.index + 1}`,
            format: "image",
            status: "ready",
            videoUrl: result.cloned_url,
            thumbnailUrl: result.original_url,
          }),
        });
      }
      router.push("/library");
    } catch {
      setError("Failed to save to library");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSlide = async (slideIndex: number) => {
    const prompt = editPrompts[slideIndex]?.trim();
    if (!prompt || !jobResult) return;

    const slide = jobResult.results.find((r) => r.index === slideIndex);
    if (!slide) return;

    setEditingSlide(slideIndex);
    setError(null);

    try {
      const imgRes = await fetch(slide.cloned_url);
      const blob = await imgRes.blob();
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/clone-post/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: b64, prompt }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Edit failed";
        try { msg = JSON.parse(text).error || msg; } catch {}
        throw new Error(msg);
      }

      const { image_b64 } = await res.json();
      const newUrl = `data:image/png;base64,${image_b64}`;

      setJobResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          results: prev.results.map((r) =>
            r.index === slideIndex ? { ...r, cloned_url: newUrl } : r
          ),
        };
      });
      setEditPrompts((prev) => ({ ...prev, [slideIndex]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setEditingSlide(null);
    }
  };

  return (
    <main className="pt-28 pb-20 px-6 max-w-3xl mx-auto">
      <header className="mb-10">
        <button
          onClick={() => router.push("/create")}
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface mb-4 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">
          Post Cloner
        </h1>
        <p className="text-on-surface-variant text-lg">
          Recreate any Instagram post from screenshots
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm">
          {error}
        </div>
      )}

      {step === "input" && (
        <div className="flex flex-col gap-8">
          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Upload Screenshots
            </h3>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">upload_file</span>
              <p className="text-sm text-on-surface-variant font-medium">Drop screenshots here or click to browse</p>
              <p className="text-xs text-outline mt-1">.png, .jpg, .jpeg, .webp — multiple files for carousel posts</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg text-on-surface-variant">image</span>
                      <span className="text-sm text-on-surface font-medium truncate max-w-[200px]">{f.name}</span>
                      <span className="text-xs text-outline">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Clone Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCloneMode("exact")}
                className={`p-4 rounded-xl text-left transition-all ${
                  cloneMode === "exact"
                    ? "ring-2 ring-primary bg-primary-container/10"
                    : "bg-surface-container-lowest hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-2xl mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>content_copy</span>
                <h4 className="font-headline font-bold text-on-surface">Exact Clone</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Keeps original background as-is. Best for maps, charts, infographics.
                </p>
              </button>
              <button
                onClick={() => setCloneMode("fresh")}
                className={`p-4 rounded-xl text-left transition-all ${
                  cloneMode === "fresh"
                    ? "ring-2 ring-primary bg-primary-container/10"
                    : "bg-surface-container-lowest hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-2xl mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>palette</span>
                <h4 className="font-headline font-bold text-on-surface">Fresh Design</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  New background in same style. Best for solid colors, gradients, generic photos.
                </p>
              </button>
            </div>
          </section>

          <section>
            <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Original Caption
              <span className="text-outline font-normal normal-case tracking-normal ml-2">optional</span>
            </h3>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Paste the original Instagram caption here to get a funnier rewrite..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </section>

          <button
            onClick={handleStart}
            disabled={files.length === 0}
            className="w-full py-4 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:shadow-lg hover:shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clone Post
          </button>
        </div>
      )}

      {step === "processing" && jobStatus && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
          </div>
          <div className="text-center">
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Cloning in progress...</h2>
            <p className="text-on-surface-variant">{jobStatus.current_step}</p>
          </div>

          {jobStatus.total_slides > 0 && (
            <div className="w-full max-w-sm">
              <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(jobStatus.completed_slides / jobStatus.total_slides) * 100}%` }}
                />
              </div>
              <p className="text-xs text-outline text-center mt-2">
                {jobStatus.completed_slides} / {jobStatus.total_slides} slides
              </p>
            </div>
          )}
        </div>
      )}

      {step === "results" && jobResult && (
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface">
              {jobResult.results.length} slide{jobResult.results.length !== 1 ? "s" : ""} cloned
            </h2>
          </div>

          {jobResult.results.map((result) => (
            <div key={result.index} className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-outline mb-3">Slide {result.index + 1}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant mb-2 font-medium">Original</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.original_url} alt={`Original slide ${result.index + 1}`} className="w-full rounded-lg" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-2 font-medium">Cloned</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.cloned_url} alt={`Cloned slide ${result.index + 1}`} className="w-full rounded-lg" />
                  {result.quality === "low" && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      Low quality — may have minor text issues
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => downloadSlide(result.cloned_url, result.index)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-sm font-bold transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={editPrompts[result.index] || ""}
                  onChange={(e) => setEditPrompts((prev) => ({ ...prev, [result.index]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditSlide(result.index); }}
                  placeholder="e.g. make the title bigger..."
                  disabled={editingSlide === result.index}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                />
                <button
                  onClick={() => handleEditSlide(result.index)}
                  disabled={editingSlide === result.index || !editPrompts[result.index]?.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {editingSlide === result.index ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      Editing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {jobResult.rewritten_caption && (
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                Rewritten Caption
              </h3>
              <p className="text-on-surface text-sm whitespace-pre-wrap">{jobResult.rewritten_caption}</p>
              <button
                onClick={() => navigator.clipboard.writeText(jobResult.rewritten_caption || "")}
                className="mt-3 flex items-center gap-2 text-xs text-primary font-medium hover:underline"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy caption
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSaveToLibrary}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-headline font-bold transition-all hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save to Library"}
            </button>
            <button
              onClick={() => {
                setStep("input");
                setFiles([]);
                setCaption("");
                setError(null);
                setJobResult(null);
                setJobStatus(null);
              }}
              className="px-6 py-3 rounded-xl bg-surface-container-low text-on-surface font-headline font-bold transition-all hover:bg-surface-container"
            >
              Clone Another
            </button>
          </div>
        </div>
      )}
      {creditError && (
        <InsufficientCreditsDialog
          needed={creditError.needed}
          balance={creditError.balance}
          onClose={() => setCreditError(null)}
        />
      )}
    </main>
  );
}
