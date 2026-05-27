import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useListVideos, useGetVideoStats, getListVideosQueryKey, useDeleteVideo } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Upload, Play, Film } from "lucide-react";
import { useSurveillance } from "../hooks/use-surveillance";

export function VideosPage() {
  const [, setLocation] = useLocation();
  const sessionToken = localStorage.getItem("sessionToken");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionToken) setLocation("/");
  }, [sessionToken, setLocation]);

  useSurveillance(sessionToken);

  const { data: videos, isLoading } = useListVideos();
  const { data: stats } = useGetVideoStats();
  const deleteVideo = useDeleteVideo();

  const handleDelete = (id: string) => {
    if (!confirm("Delete this video?")) return;
    deleteVideo.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }) }
    );
  };

  return (
    <div className="grain min-h-screen bg-background">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute rounded-full animate-orb-float-slow"
          style={{ width: 600, height: 600, top: "-20%", right: "-10%", background: "radial-gradient(circle, hsl(160 40% 5% / 0.8) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Hero Banner */}
      <div className="relative border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, hsl(160 50% 4%) 0%, hsl(160 40% 6%) 50%, hsl(45 30% 6%) 100%)" }} />
        <div className="relative z-10 px-4 sm:px-6 pt-10 pb-8 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4 animate-fade-in">
                <div className="gold-line w-8" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Private Collection</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-serif text-foreground tracking-wide animate-logo-in"
                style={{ textShadow: "0 0 80px hsl(45 40% 60% / 0.2)" }}>
                Greenways
              </h1>
              <div className="flex flex-wrap items-center gap-6 mt-5 animate-fade-in delay-300">
                {stats && (
                  <>
                    <div>
                      <span className="text-3xl font-serif text-primary"
                        style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.35)" }}>{stats.totalVideos}</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground ml-2">Videos</span>
                    </div>
                    <div className="w-px h-6 bg-border hidden sm:block" />
                    <div>
                      <span className="text-3xl font-serif text-primary"
                        style={{ textShadow: "0 0 30px hsl(45 40% 60% / 0.35)" }}>{stats.recentUploads}</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground ml-2">This week</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 animate-fade-in delay-200">
              <Link href="/upload"
                className="flex items-center gap-2 btn-shimmer text-primary-foreground px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:shadow-[0_0_30px_hsl(45_40%_60%/0.3)] transition-all duration-300">
                <Upload className="w-3.5 h-3.5" />
                Upload
              </Link>
              <button
                onClick={() => { localStorage.removeItem("sessionToken"); setLocation("/"); }}
                className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground border border-border/60 px-4 py-2.5 hover:border-border transition-all duration-300">
                Leave
              </button>
            </div>
          </div>
        </div>
        <div className="gold-line" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border aspect-video animate-pulse" />
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, idx) => (
              <div
                key={video.id}
                className="group card-glow bg-card border border-border/60 overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <Link href={`/video/${video.id}`} className="block relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10" />
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <Film className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-primary/40 flex items-center justify-center group-hover:border-primary/80 group-hover:shadow-[0_0_30px_hsl(45_40%_60%/0.35)] transition-all duration-500"
                      style={{ background: "hsl(160 40% 4% / 0.8)", backdropFilter: "blur(8px)" }}>
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 z-20">
                    <h3 className="text-xs font-serif text-white/90 truncate group-hover:text-primary transition-colors duration-300 leading-tight">
                      {video.title}
                    </h3>
                  </div>
                </Link>

                <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground/50 tracking-wide">
                    {new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="text-muted-foreground/30 hover:text-destructive transition-all duration-300 hover:scale-110 touch-target"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="w-16 h-16 border border-border/60 flex items-center justify-center mx-auto mb-6">
              <Film className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <div className="gold-line w-20 mx-auto mb-6" />
            <p className="text-muted-foreground text-sm mb-6">The library is empty.</p>
            <Link href="/upload"
              className="inline-block text-xs tracking-[0.2em] uppercase text-primary border border-primary/30 px-6 py-3 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(45_40%_60%/0.15)] transition-all duration-300">
              Upload the first video
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
