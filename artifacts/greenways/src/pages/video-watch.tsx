import { useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useGetVideo, getGetVideoQueryKey } from "@workspace/api-client-react";

export function WatchVideoPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const videoId = parseInt(id || "0", 10);
  const sessionToken = localStorage.getItem("sessionToken");

  useEffect(() => {
    if (!sessionToken) setLocation("/");
  }, [sessionToken, setLocation]);

  const { data: video, isLoading, isError } = useGetVideo(videoId, {
    query: {
      enabled: !!sessionToken && !!videoId,
      queryKey: getGetVideoQueryKey(videoId),
    },
  });

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
        <h1 className="text-sm font-serif text-foreground truncate" data-testid="text-video-title">
          {video?.title || "Loading..."}
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {isLoading && (
          <div className="aspect-video bg-card border border-border animate-pulse" />
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">Video not found.</p>
            <Link href="/videos" className="text-primary text-xs underline underline-offset-4 mt-2 inline-block">
              Back to library
            </Link>
          </div>
        )}

        {video && (
          <>
            <div className="aspect-video bg-black border border-border overflow-hidden">
              <video
                src={video.fileUrl}
                controls
                className="w-full h-full"
                data-testid="video-player"
              />
            </div>
            <div className="space-y-3 pb-8 border-b border-border">
              <h2 className="text-2xl font-serif text-foreground" data-testid="text-video-heading">
                {video.title}
              </h2>
              {video.description && (
                <p className="text-muted-foreground text-sm leading-relaxed" data-testid="text-video-description">
                  {video.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/50">
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
