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
    <div className="grain min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 px-6 py-4 flex items-center justify-between animate-fade-in backdrop-blur-sm sticky top-0 z-40 bg-background/90">
        <div className="flex items-center gap-4">
          <h1
            className="text-xl font-serif text-foreground tracking-wide"
            style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.15)" }}
          >
            Greenways
          </h1>
          <div className="w-px h-4 bg-border" />
          <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Library</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/upload"
            className="flex items-center gap-2 border border-border/60 px-4 py-2 text-[10px] tracking-[0.2em] uppercase text-foreground hover:border-primary/50 hover:text-primary hover:shadow-[0_0_16px_hsl(45_40%_60%/0.1)] transition-all duration-300"
            data-testid="link-upload"
          >
            <Upload className="w-3 h-3" />
            Upload
          </Link>
          <button
            onClick={() => { localStorage.removeItem("sessionToken"); setLocation("/"); }}
            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-logout"
          >
            Leave
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Stats */}
        {stats && (
          <div className="flex gap-10 mb-12 pb-8 animate-fade-in-up">
            <div data-testid="stat-total-videos">
              <p
                className="text-4xl font-serif text-primary"
                style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.35)" }}
              >
                {stats.totalVideos}
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1.5">Total Videos</p>
            </div>
            <div className="w-px bg-border" />
            <div data-testid="stat-recent-uploads">
              <p
                className="text-4xl font-serif text-primary"
                style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.35)" }}
              >
                {stats.recentUploads}
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1.5">This Week</p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="gold-line mb-8 animate-fade-in delay-200" />

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border aspect-video animate-pulse rounded-sm" />
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video, idx) => (
              <div
                key={video.id}
                className="group card-glow bg-card border border-border/60 overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
                data-testid={`card-video-${video.id}`}
              >
                <Link href={`/video/${video.id}`} className="block relative aspect-video bg-muted overflow-hidden">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div
                      className="w-14 h-14 rounded-full border border-primary/40 flex items-center justify-center group-hover:border-primary/70 group-hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)] transition-all duration-400"
                      style={{ background: "hsl(160 40% 4% / 0.7)", backdropFilter: "blur(4px)" }}
                    >
                      <Play className="w-5 h-5 text-primary ml-1" fill="currentColor" />
                    </div>
                  </div>

                  {/* File label */}
                  <div className="absolute bottom-2 left-3 right-3 z-20">
                    <span className="text-[10px] text-foreground/40 font-mono">
                      {video.filename.slice(-16)}
                    </span>
                  </div>
                </Link>

                <div className="p-4 flex items-start justify-between gap-3 border-t border-border/40">
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-serif text-foreground truncate group-hover:text-primary transition-colors duration-300"
                      data-testid={`text-video-title-${video.id}`}
                    >
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/40 mt-2 tracking-wide">
                      {new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="text-muted-foreground/40 hover:text-destructive transition-all duration-300 flex-shrink-0 mt-0.5 hover:scale-110"
                    data-testid={`button-delete-${video.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="gold-line w-20 mx-auto mb-8" />
            <p className="text-muted-foreground text-sm mb-5">The library is empty.</p>
            <Link
              href="/upload"
              className="inline-block text-xs tracking-[0.2em] uppercase text-primary border border-primary/30 px-6 py-3 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(45_40%_60%/0.15)] transition-all duration-300"
            >
              Upload the first video
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
