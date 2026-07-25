import {
  Film,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { galleryImageUrl, localVideos, type LocalVideo } from "./local-media";

const SNAP_ID = "ekampreet.16";

type ActiveTab = "videos" | "images";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
}

function LikeButton({ mediaId }: { mediaId: string }) {
  const [likeCount, setLikeCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    void fetch(`/api/videos/${mediaId}/likes`)
      .then((response) => response.json())
      .then((result) => {
        if (typeof result.count === "number") {
          setLikeCount(result.count);
        }
      })
      .catch(() => {
        setLikeCount(0);
      });
  }, [mediaId]);

  const toggleLike = async () => {
    if (isLiked) return;

    const response = await fetch(`/api/videos/${mediaId}/likes`, {
      method: "POST",
    });
    if (!response.ok) return;

    const result = await response.json();
    if (typeof result.count === "number") {
      setLikeCount(result.count);
      setIsLiked(true);
    }
  };

  return (
    <div className="like-widget">
      <button
        type="button"
        className={`like-button${isLiked ? " is-liked" : ""}`}
        onClick={toggleLike}
        aria-label={isLiked ? "Unlike" : "Like"}
        aria-pressed={isLiked}
        title={isLiked ? "Unlike" : "Like"}
      >
        <Heart aria-hidden="true" />
      </button>
      <span className="like-count">{likeCount}</span>
    </div>
  );
}

function CommentSection({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    void fetch(`/api/videos/${videoId}/comments`)
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result)) {
          setComments(result);
        }
      })
      .catch(() => {
        setComments([]);
      });
  }, [videoId]);

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    const response = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) return;

    const createdComment = await response.json();
    setComments((current) => [...current, createdComment]);
    setDraft("");
  };

  return (
    <section className="comments" aria-label="Video comments">
      <div className="comments-heading">
        <span>
          <MessageCircle aria-hidden="true" />
          Comments
        </span>
        <strong>{comments.length}</strong>
      </div>

      {comments.length > 0 && (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <span className="comment-avatar" aria-hidden="true">
                A
              </span>
              <div>
                <strong>Anonymous</strong>
                <p>{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={addComment}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          type="text"
          maxLength={240}
          placeholder="Add a comment"
          aria-label="Add a comment"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Post comment"
          title="Post comment"
        >
          <Send aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}

function VideoPreviewOverlay({
  video,
  onClose,
}: {
  video: LocalVideo;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    setProgress(0);
    setIsPlaying(false);

    const handleTimeUpdate = () => {
      if (!element.duration) return;
      setProgress((element.currentTime / element.duration) * 100);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    element.addEventListener("timeupdate", handleTimeUpdate);
    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);

    element.volume = volume;
    element.muted = isMuted;

    return () => {
      element.removeEventListener("timeupdate", handleTimeUpdate);
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
    };
  }, [video, isMuted, volume]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const togglePlay = () => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      void element.play();
    } else {
      element.pause();
    }
  };

  const toggleMute = () => {
    const element = videoRef.current;
    if (!element) return;
    const nextMuted = !element.muted;
    element.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (value: number) => {
    const element = videoRef.current;
    if (!element) return;
    element.volume = value;
    setVolume(value);
    if (value > 0 && element.muted) {
      element.muted = false;
      setIsMuted(false);
    }
  };

  const handleSeek = (value: number) => {
    const element = videoRef.current;
    if (
      !element ||
      !Number.isFinite(element.duration) ||
      element.duration <= 0
    ) {
      return;
    }

    element.currentTime = (value / 100) * element.duration;
    setProgress(value);
  };

  return (
    <div
      className="video-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${video.title}`}
    >
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-card">
        <button
          type="button"
          className="overlay-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X aria-hidden="true" />
        </button>

        <div className="overlay-player">
          <div className="overlay-media">
            <video
              ref={videoRef}
              src={video.url}
              playsInline
              preload="metadata"
              muted={isMuted}
              onClick={togglePlay}
            >
              Your browser cannot play this video.
            </video>
          </div>

          <div className="custom-player-controls" aria-label="Video controls">
            <input
              className="player-progress"
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={(event) => handleSeek(Number(event.target.value))}
              aria-label="Seek video"
              title="Seek video"
            />
            <div className="player-controls">
              <button
                type="button"
                className="player-button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                title={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="player-button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX aria-hidden="true" />
                ) : (
                  <Volume2 aria-hidden="true" />
                )}
              </button>
              <div className="player-volume">
                <input
                  id="volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(event) =>
                    handleVolumeChange(Number(event.target.value))
                  }
                  aria-label="Volume"
                  title="Volume"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overlay-details">
          <div className="overlay-heading">
            <div>
              <p className="card-kicker">School clip</p>
              <h2>{video.title}</h2>
            </div>
            <LikeButton mediaId={video.id} />
          </div>
          <div className="video-card-snap">
            <span>Snap ID</span>
            <strong>{SNAP_ID}</strong>
          </div>
          <CommentSection videoId={video.id} />
        </div>
      </div>
    </div>
  );
}

function VideoCard({
  video,
  index,
  onOpenPreview,
}: {
  video: LocalVideo;
  index: number;
  onOpenPreview: (video: LocalVideo) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const showPreviewFrame = () => {
    const element = videoRef.current;
    if (
      !element ||
      !Number.isFinite(element.duration) ||
      element.duration <= 0
    ) {
      return;
    }

    element.currentTime = Math.min(0.2, element.duration / 5);
  };

  return (
    <article className="video-card">
      <div className="video-frame" onClick={() => onOpenPreview(video)}>
        <video
          ref={videoRef}
          src={video.url}
          playsInline
          preload="metadata"
          onLoadedMetadata={showPreviewFrame}
          muted
          tabIndex={-1}
          controls={false}
        >
          Your browser cannot play this video.
        </video>
        <div className="home-video-overlay">
          <span className="home-video-play">
            <Play aria-hidden="true" />
          </span>
        </div>
        <span className="video-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="video-card-heading">
        <div>
          <p className="card-kicker">School clip</p>
          <h2>{video.title}</h2>
        </div>
        <LikeButton mediaId={video.id} />
      </div>

      <div className="video-card-snap">
        <span>Snap ID</span>
        <strong>{SNAP_ID}</strong>
      </div>
    </article>
  );
}

function VideosView({
  onOpenPreview,
}: {
  onOpenPreview: (video: LocalVideo) => void;
}) {
  return (
    <section
      className="content-view"
      id="videos-panel"
      role="tabpanel"
      aria-labelledby="videos-tab"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">Latest uploads</p>
          <h1>Leak videos</h1>
        </div>
        <span className="media-count">
          <Film aria-hidden="true" />
          {localVideos.length} clips
        </span>
      </div>

      <div className="video-grid">
        {localVideos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            index={index}
            onOpenPreview={onOpenPreview}
          />
        ))}
      </div>
    </section>
  );
}

function ImagesView() {
  return (
    <section
      className="content-view"
      id="images-panel"
      role="tabpanel"
      aria-labelledby="images-tab"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">Image archive</p>
          <h1>Images</h1>
        </div>
        <span className="media-count">
          <ImageIcon aria-hidden="true" />1 image
        </span>
      </div>

      <figure className="image-card">
        <div className="image-frame">
          <img src={galleryImageUrl} alt="hate.jpeg" />
        </div>
        <figcaption>
          <div>
            <p className="card-kicker">Image 01</p>
            <h2>hate.jpeg</h2>
          </div>
          <LikeButton mediaId="hate-image" />
        </figcaption>
      </figure>
    </section>
  );
}

function AgeGateModal({
  onAgree,
  onDeny,
  denied,
  visitorCount,
}: {
  onAgree: () => void;
  onDeny: () => void;
  denied: boolean;
  visitorCount: number;
}) {
  return (
    <div
      className="age-gate-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Age restricted content warning"
    >
      <div className="age-gate-backdrop" />
      <div className="age-gate-card">
        <div className="age-gate-header">
          <p>Warning</p>
          <strong>+18 content ahead</strong>
        </div>
        <p className="age-gate-text">
          This site contains mature content and is intended for adults only.
          Please confirm you are 18 years or older to continue.
        </p>
        <p className="age-gate-visits">
          {visitorCount.toLocaleString()} users have visited this page.
        </p>
        {denied ? (
          <p className="age-gate-denied">
            Access denied. You cannot view this site without agreeing.
          </p>
        ) : null}
        <div className="age-gate-actions">
          <button type="button" className="button-secondary" onClick={onDeny}>
            Deny
          </button>
          <button type="button" className="button-primary" onClick={onAgree}>
            Agree
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("videos");
  const [selectedVideo, setSelectedVideo] = useState<LocalVideo | null>(null);
  const [hasAgeConsent, setHasAgeConsent] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("greenway-age-consent") === "true",
  );
  const [visitorCount, setVisitorCount] = useState<number>(() =>
    typeof window !== "undefined"
      ? Number(window.localStorage.getItem("greenway-visitor-count") ?? "0")
      : 0,
  );
  const [ageDenied, setAgeDenied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasAgeConsent) return;
    const count =
      Number(window.localStorage.getItem("greenway-visitor-count") ?? "0") + 1;
    window.localStorage.setItem("greenway-visitor-count", String(count));
    setVisitorCount(count);
  }, [hasAgeConsent]);

  const handleAgree = () => {
    setHasAgeConsent(true);
    setAgeDenied(false);
    window.localStorage.setItem("greenway-age-consent", "true");
  };

  const handleDeny = () => {
    setHasAgeConsent(false);
    setAgeDenied(true);
    window.localStorage.removeItem("greenway-age-consent");
  };

  if (!hasAgeConsent) {
    return (
      <AgeGateModal
        onAgree={handleAgree}
        onDeny={handleDeny}
        denied={ageDenied}
        visitorCount={visitorCount}
      />
    );
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Greenway School Leaks home">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span className="brand-copy">
            <strong>Greenway School Leaks</strong>
            <small>Media archive</small>
          </span>
        </a>

        <nav className="tab-list" role="tablist" aria-label="Media views">
          <button
            id="videos-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "videos"}
            aria-controls="videos-panel"
            className={activeTab === "videos" ? "is-active" : ""}
            onClick={() => setActiveTab("videos")}
          >
            <Film aria-hidden="true" />
            Videos
          </button>
          <button
            id="images-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "images"}
            aria-controls="images-panel"
            className={activeTab === "images" ? "is-active" : ""}
            onClick={() => setActiveTab("images")}
          >
            <ImageIcon aria-hidden="true" />
            Images
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === "videos" ? (
          <VideosView onOpenPreview={setSelectedVideo} />
        ) : (
          <ImagesView />
        )}
      </main>

      <footer className="site-footer" aria-label="Site footer">
        <span>bewafa</span>
      </footer>

      {selectedVideo && (
        <VideoPreviewOverlay
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
