import imageUrl from "../../../assets/hate.jpeg?url";

const videoModules = import.meta.glob("../../../assets/*.{mp4,webm,mov,m4v}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

export interface LocalVideo {
  id: string;
  title: string;
  url: string;
}

export const galleryImageUrl = imageUrl;

export const localVideos: LocalVideo[] = Object.entries(videoModules)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, url], index) => ({
    id: `archive-video-${index + 1}`,
    title: `Moment ${String(index + 1).padStart(2, "0")}`,
    url,
  }));
