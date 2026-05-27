import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useListVideos, useGetVideoStats, getListVideosQueryKey, useDeleteVideo } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, Play } from "lucide-react";

export function VideosPage() {
  const [, setLocation] = useLocation();
  const sessionToken = localStorage.getItem("sessionToken");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionToken) setLocation("/");
  }, [sessionToken, setLocation]);

  const { data: videos, isLoading } = useListVideos();
  const { data: stats } = useGetVideoStats();
  const deleteVideo = useDeleteVideo();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this video?")) return;
    deleteVideo.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }) }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-serif text-foreground tracking-wide">Greenways</h1>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs tracking-widest uppercase text-muted-foreground">Library</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/upload"
            className="flex items-center gap-2 border border-border px-4 py-2 text-xs tracking-widest uppercase text-foreground hover:border-primary transition-colors"
            data-testid="link-upload"
          >
            <Upload className="w-3 h-3" />
            Upload
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("sessionToken");
              setLocation("/");
            }}
            className="text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-logout"
          >
            Leave
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {stats && (
          <div className="flex gap-8 mb-10 pb-8 border-b border-border">
            <div data-testid="stat-total-videos">
              <p className="text-3xl font-serif text-primary">{stats.totalVideos}</p>
              <p className="text-xs tracking-widest uppercase text-muted-foreground mt-1">Total Videos</p>
            </div>
            <div className="w-px bg-border" />
            <div data-testid="stat-recent-uploads">
              <p className="text-3xl font-serif text-primary">{stats.recentUploads}</p>
              <p className="text-xs tracking-widest uppercase text-muted-foreground mt-1">This Week</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border aspect-video animate-pulse" />
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group bg-card border border-border overflow-hidden"
                data-testid={`card-video-${video.id}`}
              >
                <Link href={`/video/${video.id}`} className="block relative aspect-video bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Play className="w-5 h-5 text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-xs text-foreground/60 font-mono">
                      {video.filename.slice(-12)}
                    </span>
                  </div>
                </Link>
                <div className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-serif text-foreground truncate"
                      data-testid={`text-video-title-${video.id}`}
                    >
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-2">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                    data-testid={`button-delete-${video.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-px bg-border mx-auto mb-6" />
            <p className="text-muted-foreground text-sm">No videos yet.</p>
            <Link
              href="/upload"
              className="inline-block mt-4 text-xs tracking-widest uppercase text-primary underline underline-offset-4"
            >
              Upload the first one
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
