import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListVideosQueryKey } from "@workspace/api-client-react";
import { Upload, ChevronLeft, Film } from "lucide-react";

export function UploadPage() {
  const [, setLocation] = useLocation();
  const sessionToken = localStorage.getItem("sessionToken");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionToken) setLocation("/");
  }, [sessionToken, setLocation]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("video/")) setFile(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setError("");
    setUploading(true);
    setProgress(20);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("sessionToken", sessionToken || "");
      formData.append("file", file);
      setProgress(50);
      const res = await fetch("/api/videos/upload", { method: "POST", body: formData });
      setProgress(90);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      setProgress(100);
      setLocation("/videos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="grain min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 px-6 py-4 flex items-center gap-4 animate-fade-in backdrop-blur-sm sticky top-0 z-40 bg-background/90">
        <Link
          href="/videos"
          className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-back"
        >
          <ChevronLeft className="w-3 h-3" />
          Library
        </Link>
        <div className="w-px h-4 bg-border" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Upload</span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="space-y-2 mb-10 animate-fade-in-up">
          <h2
            className="text-3xl font-serif text-foreground"
            style={{ textShadow: "0 0 40px hsl(45 40% 60% / 0.1)" }}
          >
            Add a Video
          </h2>
          <div className="gold-line w-16 mt-3" />
          <p className="text-muted-foreground text-sm pt-1">Upload a video to the Greenways library.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-100" data-testid="form-upload">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-card/80 border border-border/60 text-foreground px-4 py-3.5 text-sm focus:outline-none focus:border-primary/60 focus:shadow-[0_0_20px_hsl(45_40%_60%/0.08)] transition-all duration-300"
              placeholder="Video title"
              required
              data-testid="input-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-card/80 border border-border/60 text-foreground px-4 py-3.5 text-sm focus:outline-none focus:border-primary/60 focus:shadow-[0_0_20px_hsl(45_40%_60%/0.08)] transition-all duration-300 resize-none"
              placeholder="Optional description"
              data-testid="input-description"
            />
          </div>

          {/* File drop zone */}
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Video File *</label>
            <label
              htmlFor="file-input"
              className={`flex flex-col items-center justify-center w-full h-36 border cursor-pointer transition-all duration-300 ${
                dragOver
                  ? "border-primary/70 bg-primary/5 shadow-[0_0_30px_hsl(45_40%_60%/0.1)]"
                  : file
                  ? "border-primary/30 bg-card/80"
                  : "border-dashed border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/60"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              data-testid="label-file-drop"
            >
              {file ? (
                <div className="text-center px-6 animate-fade-in">
                  <Film className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm text-foreground truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-5 h-5 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Drop video or click to browse</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1.5 tracking-wider uppercase">
                    MP4 · MOV · AVI · WebM
                  </p>
                </div>
              )}
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                data-testid="input-file"
              />
            </label>
          </div>

          {error && (
            <p className="text-destructive text-xs animate-fade-in" data-testid="text-error">{error}</p>
          )}

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2 animate-fade-in">
              <div className="w-full bg-muted/50 h-px overflow-hidden">
                <div
                  className="h-px transition-all duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(to right, hsl(45 30% 45%), hsl(45 50% 72%))",
                    boxShadow: "0 0 8px hsl(45 40% 60% / 0.6)",
                  }}
                />
              </div>
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Uploading…</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || !file || uploading}
            className="btn-shimmer w-full text-primary-foreground py-3.5 text-xs tracking-[0.25em] uppercase font-medium disabled:opacity-40 transition-all duration-300 hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)]"
            data-testid="button-upload"
          >
            {uploading ? "Uploading…" : "Upload Video"}
          </button>
        </form>
      </main>
    </div>
  );
}
