"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ContentItem {
  id: string;
  jobId: string;
  title: string;
  format: string;
  templateId: string | null;
  backgroundMode: string | null;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  script: string | null;
  durationSec: number | null;
  renderTimeSec: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const formatFilters = [
  { key: "all", label: "All" },
  { key: "video", label: "Videos", icon: "movie" },
  { key: "carousel", label: "Carousels", icon: "view_carousel" },
  { key: "image", label: "Images", icon: "image" },
  { key: "text", label: "Text", icon: "article" },
];

const statusFilters = [
  { key: "all", label: "All" },
  { key: "rendering", label: "Rendering", icon: "hourglass_top" },
  { key: "ready", label: "Ready", icon: "check_circle" },
  { key: "failed", label: "Failed", icon: "error" },
];

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

function formatLabel(format: string): string {
  return format.charAt(0).toUpperCase() + format.slice(1);
}

// ── Video Preview Modal ──

function VideoPreviewModal({
  item,
  onClose,
}: {
  item: ContentItem;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface">
              {item.title}
            </h3>
            <p className="text-sm text-on-surface-variant">
              {formatLabel(item.format)}
              {item.backgroundMode && ` \u00B7 ${item.backgroundMode}`}
              {item.durationSec && ` \u00B7 ${formatDuration(item.durationSec)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Video */}
        <div className="bg-black aspect-video">
          {item.videoUrl ? (
            <video
              src={item.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <span className="material-symbols-outlined text-5xl">
                videocam_off
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="relative group">
            <button className="flex items-center gap-2 px-5 py-2.5 primary-gradient text-on-primary rounded-xl font-bold text-sm opacity-60 cursor-not-allowed">
              <span className="material-symbols-outlined text-lg">send</span>
              Post
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Coming soon
            </div>
          </div>
          {item.videoUrl && (
            <a
              href={item.videoUrl}
              download
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-on-surface rounded-xl font-bold text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                download
              </span>
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Content Card ──

function ContentCard({
  item,
  onReview,
  onDelete,
}: {
  item: ContentItem;
  onReview: () => void;
  onDelete: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isRendering = item.status === "rendering";
  const isReady = item.status === "ready";
  const isFailed = item.status === "failed";

  const elapsedSec = Math.floor(
    (Date.now() - new Date(item.createdAt).getTime()) / 1000
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Thumbnail area */}
      <div
        className={`aspect-video flex items-center justify-center relative ${
          isRendering
            ? "bg-gradient-to-br from-violet-50 to-purple-50"
            : isFailed
            ? "bg-gradient-to-br from-red-50 to-rose-50"
            : "bg-zinc-100"
        }`}
        onClick={isReady ? onReview : undefined}
        style={isReady ? { cursor: "pointer" } : undefined}
      >
        {isRendering && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-violet-200 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-medium text-primary">
              Rendering...
            </span>
            <span className="text-xs text-on-surface-variant">
              {formatDuration(elapsedSec)} elapsed
            </span>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="material-symbols-outlined text-4xl text-error">
              error_outline
            </span>
            <span className="text-sm font-medium text-error">
              Render failed
            </span>
            {item.error && (
              <span className="text-xs text-on-surface-variant line-clamp-2">
                {item.error}
              </span>
            )}
          </div>
        )}

        {isReady && (
          <>
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <span
                  className="material-symbols-outlined text-5xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {item.format === "video"
                    ? "movie"
                    : item.format === "carousel"
                    ? "view_carousel"
                    : item.format === "image"
                    ? "image"
                    : "article"}
                </span>
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <span
                  className="material-symbols-outlined text-3xl text-primary ml-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-headline font-bold text-sm text-on-surface truncate mb-1">
          {item.title}
        </h3>
        <p className="text-xs text-on-surface-variant mb-1">
          {formatLabel(item.format)}
          {item.backgroundMode && ` \u00B7 ${item.backgroundMode}`}
        </p>
        <p className="text-xs text-on-surface-variant">
          {item.durationSec ? `${formatDuration(item.durationSec)} \u00B7 ` : ""}
          {relativeTime(item.createdAt)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
          {isReady && (
            <button
              onClick={onReview}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                visibility
              </span>
              Review
            </button>
          )}

          {isReady && (
            <div className="relative group/post">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant bg-zinc-50 rounded-lg opacity-60 cursor-not-allowed">
                <span className="material-symbols-outlined text-sm">send</span>
                Post
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded-md opacity-0 group-hover/post:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Coming soon
              </div>
            </div>
          )}

          {isFailed && (
            <Link
              href="/create"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                refresh
              </span>
              Retry
            </Link>
          )}

          {/* Delete — always shown */}
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-on-surface-variant hover:text-error hover:bg-red-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs font-bold text-white bg-error rounded-lg hover:bg-error-dim transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 text-xs text-on-surface-variant hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center mb-6">
        <span
          className="material-symbols-outlined text-4xl text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          video_library
        </span>
      </div>
      <h2 className="font-headline font-bold text-xl text-on-surface mb-2">
        No content yet
      </h2>
      <p className="text-on-surface-variant mb-6 max-w-sm">
        Create your first video to see it here. Your rendered content will
        appear in this library.
      </p>
      <Link
        href="/create"
        className="inline-flex items-center gap-2 px-6 py-3 primary-gradient text-on-primary rounded-xl font-bold shadow-md hover:shadow-lg transition-shadow"
      >
        <span className="material-symbols-outlined">add</span>
        Create Content
      </Link>
    </div>
  );
}

// ── Main Page ──

export default function LibraryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      console.error("Failed to fetch library:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Poll every 10s while any items are rendering
  const hasRenderingItems = items.some((i) => i.status === "rendering");

  useEffect(() => {
    if (!hasRenderingItems) return;
    const interval = setInterval(fetchLibrary, 10000);
    return () => clearInterval(interval);
  }, [hasRenderingItems, fetchLibrary]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Apply filters
  const filtered = items.filter((item) => {
    if (formatFilter !== "all" && item.format !== formatFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-3 border-violet-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-1">
          Content Library
        </h1>
        <p className="text-on-surface-variant">
          All your created content in one place
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Format pills */}
            <div className="flex items-center gap-1.5 bg-zinc-100 rounded-xl p-1">
              {formatFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFormatFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    formatFilter === f.key
                      ? "bg-white text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {f.icon && (
                    <span className="material-symbols-outlined text-base">
                      {f.icon}
                    </span>
                  )}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1.5 bg-zinc-100 rounded-xl p-1">
              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === f.key
                      ? "bg-white text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {f.icon && (
                    <span className="material-symbols-outlined text-base">
                      {f.icon}
                    </span>
                  )}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Count */}
            <span className="ml-auto text-sm text-on-surface-variant">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">
                filter_list_off
              </span>
              No content matches these filters
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onReview={() => setPreviewItem(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Video Preview Modal */}
      {previewItem && (
        <VideoPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
