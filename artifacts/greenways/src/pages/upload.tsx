import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListVideosQueryKey } from "@workspace/api-client-react";
import { Upload } from "lucide-react";

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
      const res = await fetch("/api/videos/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(90);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link
          href="/videos"
          className="text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-back"
        >
          &larr; Library
        </Link>
        <div className="w-px h-4 bg-border" />
        <span className="text-xs tracking-widest uppercase text-muted-foreground">Upload</span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-serif text-foreground">Add a Video</h2>
          <p className="text-muted-foreground text-sm">Upload a video to the Greenways library.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-upload">
          <div className="space-y-1">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-card border border-border text-foreground px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Video title"
              required
              data-testid="input-title"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-card border border-border text-foreground px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Optional description"
              data-testid="input-description"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Video File *</label>
            <label
              htmlFor="file-input"
              className="flex flex-col items-center justify-center w-full h-32 bg-card border border-dashed border-border cursor-pointer hover:border-primary transition-colors"
              data-testid="label-file-drop"
            >
              {file ? (
                <div className="text-center px-4">
                  <p className="text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select video</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">MP4, MOV, AVI, WebM</p>
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
            <p className="text-destructive text-xs" data-testid="text-error">{error}</p>
          )}

          {uploading && (
            <div className="space-y-1">
              <div className="w-full bg-muted h-1">
                <div
                  className="bg-primary h-1 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || !file || uploading}
            className="w-full bg-primary text-primary-foreground py-3 text-xs tracking-widest uppercase font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            data-testid="button-upload"
          >
            {uploading ? "Uploading..." : "Upload Video"}
          </button>
        </form>
      </main>
    </div>
  );
}
