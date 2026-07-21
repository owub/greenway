import portraitUrl from "../../../assets/hate.jpeg?url";

const videoModules = import.meta.glob("../../../assets/*.{mp4,webm,mov,m4v}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

export interface LocalVideo {
  id: string;
  title: string;
  filename: string;
  url: string;
}

export const schoolPortraitUrl = portraitUrl;

export const localVideos: LocalVideo[] = Object.entries(videoModules)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([sourcePath, url], index) => {
    const filename = sourcePath.split("/").pop() ?? `video-${index + 1}.mp4`;

    return {
      id: `greenways-video-${index + 1}`,
      title: `Greenways Reel ${String(index + 1).padStart(2, "0")}`,
      filename,
      url,
    };
  });
