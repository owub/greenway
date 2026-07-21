import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Play } from "lucide-react";
import { localVideos, type LocalVideo } from "../local-media";

function VideoPreview({ video }: { video: LocalVideo }) {
  const previewRef = useRef<HTMLVideoElement>(null);

  const showPreviewFrame = () => {
    const element = previewRef.current;
    if (
      !element ||
      !Number.isFinite(element.duration) ||
      element.duration <= 0
    ) {
      return;
    }

    element.currentTime = Math.min(0.25, element.duration / 4);
  };

  return (
    <video
      ref={previewRef}
      src={video.url}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={showPreviewFrame}
      aria-hidden="true"
    />
  );
}

export function VideoLibrary() {
  const [selectedId, setSelectedId] = useState(localVideos[0]?.id ?? "");
  const playerRef = useRef<HTMLVideoElement>(null);
  const selectedVideo = useMemo(
    () =>
      localVideos.find((video) => video.id === selectedId) ??
      localVideos[0] ??
      null,
    [selectedId],
  );

  useEffect(() => {
    playerRef.current?.load();
  }, [selectedVideo?.id]);

  const selectVideo = (video: LocalVideo) => {
    setSelectedId(video.id);
    requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  };

  return (
    <section className="app-card media-library" aria-labelledby="video-heading">
      <header className="card-header">
        <div>
          <p className="eyebrow">School archive</p>
          <h2 id="video-heading">Video library</h2>
        </div>
        <span className="count-badge">
          <Film aria-hidden="true" />
          {localVideos.length}
        </span>
      </header>

      {selectedVideo ? (
        <div className="media-library-body">
          <div className="featured-video">
            <video
              ref={playerRef}
              controls
              playsInline
              preload="metadata"
              src={selectedVideo.url}
            >
              Your browser cannot play this video.
            </video>
          </div>

          <div className="featured-meta">
            <div>
              <p className="eyebrow">Now viewing</p>
              <h3>{selectedVideo.title}</h3>
            </div>
            <p>{selectedVideo.filename}</p>
          </div>

          <div className="video-grid" aria-label="All Greenways videos">
            {localVideos.map((video, index) => {
              const isSelected = video.id === selectedVideo.id;

              return (
                <button
                  key={video.id}
                  type="button"
                  className={`video-tile${isSelected ? " is-active" : ""}`}
                  onClick={() => selectVideo(video)}
                  aria-pressed={isSelected}
                  aria-label={`Play ${video.title}`}
                >
                  <span className="video-thumbnail">
                    <VideoPreview video={video} />
                    <span className="video-play" aria-hidden="true">
                      <Play />
                    </span>
                    <span className="video-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <span className="video-tile-copy">
                    <strong>{video.title}</strong>
                    <span>{isSelected ? "Playing" : "View film"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <Film aria-hidden="true" />
          <p>No local videos found.</p>
        </div>
      )}
    </section>
  );
}
