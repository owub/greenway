import { useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useGetVideo, getGetVideoQueryKey } from "@workspace/api-client-react";
import { ChevronLeft } from "lucide-react";

export function WatchVideoPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const sessionToken = localStorage.getItem("sessionToken");

  useEffect(() => {
    if (!sessionToken) setLocation("/");
  }, [sessionToken, setLocation]);

  const { data: video, isLoading, isError } = useGetVideo(id ?? "", {
    query: {
      enabled: !!sessionToken && !!id,
      queryKey: getGetVideoQueryKey(id ?? ""),
    },
  });

  return (
    <div className="grain min-h-screen bg-background">
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
        <h1
          className="text-sm font-serif text-foreground/80 truncate"
          data-testid="text-video-title"
        >
          {video?.title || "Loading…"}
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {isLoading && (
          <div className="aspect-video bg-card border border-border animate-pulse" />
        )}

        {isError && (
          <div className="text-center py-24 animate-fade-in-up">
            <div className="gold-line w-16 mx-auto mb-6" />
            <p className="text-muted-foreground text-sm mb-4">Video not found.</p>
            <Link href="/videos" className="text-primary text-xs tracking-widest uppercase underline underline-offset-4">
              Back to library
            </Link>
          </div>
        )}

        {video && (
          <>
            <div
              className="aspect-video bg-black overflow-hidden animate-fade-in-up"
              style={{ boxShadow: "0 20px 80px hsl(160 60% 3% / 0.9), 0 0 0 1px hsl(160 30% 12%)" }}
            >
              <video
                src={video.fileUrl}
                controls
                autoPlay={false}
                className="w-full h-full"
                data-testid="video-player"
              />
            </div>

            <div className="space-y-4 pb-8 animate-fade-in-up delay-200">
              <h2
                className="text-3xl font-serif text-foreground"
                style={{ textShadow: "0 0 40px hsl(45 40% 60% / 0.1)" }}
                data-testid="text-video-heading"
              >
                {video.title}
              </h2>
              <div className="gold-line w-24" />
              {video.description && (
                <p
                  className="text-muted-foreground text-sm leading-relaxed max-w-2xl"
                  data-testid="text-video-description"
                >
                  {video.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/40 tracking-widest uppercase">
                {new Date(video.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
