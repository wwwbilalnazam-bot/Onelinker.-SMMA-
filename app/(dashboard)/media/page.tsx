"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Images, Upload, Search, Trash2, Copy,
  Image as ImageIcon, Film, Grid3X3, List, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

type MediaFilterType = "all" | "images" | "videos";
type ViewMode = "grid" | "list";

interface MediaFileRow {
  id: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  alt_text: string | null;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024)        return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function getFileName(url: string) {
  try { return decodeURIComponent(url.split("/").pop() ?? url).split("?")[0] ?? url; }
  catch { return url; }
}

const GRADIENTS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-teal-500",
  "from-orange-500 to-yellow-500",
  "from-rose-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-slate-600 to-slate-800",
  "from-blue-600 to-blue-400",
];

export default function MediaPage() {
  const supabase = createClient();
  const { workspace, usage } = useWorkspace();

  const [media, setMedia]       = useState<MediaFileRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter]     = useState<MediaFilterType>("all");
  const [view, setView]         = useState<ViewMode>("grid");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("media_files")
      .select("id, file_url, file_type, file_size, created_at, alt_text")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false });
    setMedia(data ?? []);
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const filtered = media.filter((m) => {
    if (filter === "images" && !m.file_type?.startsWith("image")) return false;
    if (filter === "videos" && !m.file_type?.startsWith("video")) return false;
    if (search && !getFileName(m.file_url ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const storageMB      = usage?.storage_used_mb ?? 0;
  const storageLimitMB = usage?.storage_limit_mb ?? 50;
  const storagePercent = storageLimitMB ? Math.min(100, Math.round((storageMB / storageLimitMB) * 100)) : 0;

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function handleDeleteSelected() {
    if (!workspace?.id) return;
    for (const id of selected) {
      await supabase.from("media_files").delete().eq("id", id).eq("workspace_id", workspace.id);
    }
    toast.success(`Deleted ${selected.length} file${selected.length > 1 ? "s" : ""}`);
    setSelected([]);
    fetchMedia();
  }

  async function handleDeleteOne(id: string) {
    if (!workspace?.id) return;
    await supabase.from("media_files").delete().eq("id", id).eq("workspace_id", workspace.id);
    toast.success("Deleted");
    setMedia((p) => p.filter((m) => m.id !== id));
  }

  async function uploadFiles(files: File[]) {
    if (!workspace?.id) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "anon";

    let uploaded = 0;
    for (const file of files) {
      if (file.size > 200 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 200MB`);
        continue;
      }

      const path = `${workspace.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("workspace-media")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); continue; }

      const { data: urlData } = supabase.storage.from("workspace-media").getPublicUrl(path);

      await supabase.from("media_files").insert({
        workspace_id: workspace.id,
        uploaded_by: userId,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        alt_text: null,
        outstand_media_id: null,
      });
      uploaded++;
    }

    if (uploaded > 0) toast.success(`${uploaded} file${uploaded > 1 ? "s" : ""} uploaded`);
    setUploading(false);
    fetchMedia();
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) uploadFiles(files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFiles(files);
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success("URL copied!")).catch(() => toast.error("Copy failed"));
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Images className="h-6 w-6 text-primary hidden sm:block" />
            Media Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage images and videos for your posts.</p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-2 bg-primary hover:bg-primary/90 text-white">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload Files"}
        </Button>
      </div>

      {/* Storage bar */}
      <div className="rounded-xl border border-border/60 bg-card/60 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-foreground">Storage used</p>
            <p className="text-xs text-muted-foreground tabular-nums">{storageMB.toFixed(1)} MB / {storageLimitMB} MB</p>
          </div>
          <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                storagePercent > 80 ? "bg-gradient-to-r from-red-500 to-red-400" :
                storagePercent > 60 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" :
                "bg-gradient-to-r from-blue-500 to-blue-400"
              )}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            storagePercent > 80 ? "text-red-500" : "text-foreground"
          )}>{storagePercent}%</p>
          <p className="text-xs text-muted-foreground">Used</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full h-9 rounded-lg border border-border/50 bg-background/50 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex gap-1 rounded-lg border border-border/60 bg-card/60 p-1">
          {(["all","images","videos"] as MediaFilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-3 py-1 text-xs font-medium capitalize transition-all", filter === f ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-border/60 bg-card/60 p-1">
          <button onClick={() => setView("grid")} className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-all", view === "grid" ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("list")} className={cn("flex h-7 w-7 items-center justify-center rounded-md transition-all", view === "list" ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        {selected.length > 0 && (
          <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/20 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
            Delete ({selected.length})
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all duration-200",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.03]"
        )}
      >
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl mx-auto mb-3 transition-colors",
          dragging ? "bg-primary/10" : "bg-muted/40"
        )}>
          <Upload className={cn("h-6 w-6 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
        </div>
        <p className="text-sm text-foreground font-medium">
          {dragging ? "Drop to upload" : "Drop files here or browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, MP4 · Max 200MB per file</p>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileInput} />
      </div>

      {/* Media grid / list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-12 text-center">
          <Images className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground">No files found</p>
          <p className="text-sm text-muted-foreground mt-1">Upload images and videos to get started.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((file, idx) => {
            const isSelected = selected.includes(file.id);
            const isImage    = file.file_type?.startsWith("image");
            const name       = getFileName(file.file_url);

            return (
              <div
                key={file.id}
                className={cn("group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all", isSelected ? "border-foreground" : "border-transparent hover:border-border")}
                onClick={() => toggleSelect(file.id)}
              >
                {isImage ? (
                  <img src={file.file_url} alt={file.alt_text ?? name} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className={cn("aspect-square bg-gradient-to-br flex items-center justify-center", GRADIENTS[idx % GRADIENTS.length])}>
                    <Film className="h-8 w-8 text-white/70" />
                  </div>
                )}

                {isSelected && (
                  <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center">
                      <X className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white font-medium truncate">{name}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-white/70">{formatSize(file.file_size)}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.file_url); }}
                        className="flex h-5 w-5 items-center justify-center rounded bg-white/20 hover:bg-white/30"
                      >
                        <Copy className="h-3 w-3 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteOne(file.id); }}
                        className="flex h-5 w-5 items-center justify-center rounded bg-white/20 hover:bg-red-500/70"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/60 divide-y divide-border/40 overflow-hidden">
          {filtered.map((file, idx) => {
            const isSelected = selected.includes(file.id);
            const isImage    = file.file_type?.startsWith("image");
            const name       = getFileName(file.file_url);
            const date       = new Date(file.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return (
              <div
                key={file.id}
                onClick={() => toggleSelect(file.id)}
                className={cn("group flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30", isSelected && "bg-muted/50")}
              >
                <div className={cn("h-10 w-10 shrink-0 rounded-lg overflow-hidden flex items-center justify-center", !isImage && `bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]}`)}>
                  {isImage
                    ? <img src={file.file_url} alt={name} className="h-full w-full object-cover" loading="lazy" />
                    : <Film className="h-4 w-4 text-white/80" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">{isImage ? "image" : "video"} · {formatSize(file.file_size)} · {date}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.file_url); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteOne(file.id); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
