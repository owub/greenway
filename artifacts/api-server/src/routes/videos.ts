import { once } from "node:events";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { getVideoBucket, parseVideoId } from "@workspace/db";
import { requireUser } from "../middlewares/session";

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_FILENAME_LENGTH = 255;

interface StoredVideoMetadata {
  title?: unknown;
  description?: unknown;
  contentType?: unknown;
}

interface StoredVideo {
  _id: { toHexString(): string };
  filename: string;
  length: number;
  uploadDate: Date;
  metadata?: StoredVideoMetadata;
}

const router: IRouter = Router();

function decodeHeader(
  req: Request,
  name: string,
  maxLength: number,
): string | null {
  const raw = req.get(name);
  if (raw === undefined) return null;

  try {
    return decodeURIComponent(raw)
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, maxLength);
  } catch {
    return null;
  }
}

function getMetadataString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function serializeVideo(file: StoredVideo) {
  const metadata = file.metadata ?? {};

  return {
    id: file._id.toHexString(),
    title: getMetadataString(metadata.title, file.filename),
    description: getMetadataString(metadata.description) || null,
    filename: file.filename,
    contentType: getMetadataString(
      metadata.contentType,
      "application/octet-stream",
    ),
    size: file.length,
    contentUrl: `/api/videos/${file._id.toHexString()}/content`,
    createdAt: file.uploadDate.toISOString(),
  };
}

function sendRangeNotSatisfiable(res: Response, length: number): void {
  res.setHeader("Content-Range", `bytes */${length}`);
  res.sendStatus(416);
}

function getVideoId(req: Request) {
  const value = req.params.id;
  return typeof value === "string" ? parseVideoId(value) : null;
}

function parseRange(
  header: string,
  length: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const rawStart = match[1] ?? "";
  const rawEnd = match[2] ?? "";
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(length - suffixLength, 0),
      end: length - 1,
    };
  }

  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : length - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    start >= length ||
    requestedEnd < start
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(requestedEnd, length - 1),
  };
}

async function streamVideo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = getVideoId(req);
  if (!id) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const bucket = getVideoBucket();
  const file = await bucket.find({ _id: id }).next();
  if (!file) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const stored = file as StoredVideo;
  const contentType = getMetadataString(
    stored.metadata?.contentType,
    "application/octet-stream",
  );
  const rangeHeader = req.get("range");

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline");

  let start = 0;
  let end = stored.length - 1;

  if (rangeHeader) {
    const range = parseRange(rangeHeader, stored.length);
    if (!range) {
      sendRangeNotSatisfiable(res, stored.length);
      return;
    }

    start = range.start;
    end = range.end;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stored.length}`);
  }

  res.setHeader("Content-Length", String(end - start + 1));
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const download = bucket.openDownloadStream(id, {
    start,
    end: end + 1,
  });

  try {
    await pipeline(download, res);
  } catch (error) {
    if (!res.headersSent) {
      next(error);
      return;
    }
    res.destroy(error instanceof Error ? error : undefined);
  }
}

router.use("/videos", requireUser);

router.get("/videos", async (_req, res): Promise<void> => {
  const files = await getVideoBucket()
    .find({}, { sort: { uploadDate: -1 }, limit: 100 })
    .toArray();

  res.json(files.map((file) => serializeVideo(file as StoredVideo)));
});

router.post("/videos", async (req, res): Promise<void> => {
  const title = decodeHeader(req, "x-video-title", MAX_TITLE_LENGTH);
  const description =
    decodeHeader(req, "x-video-description", MAX_DESCRIPTION_LENGTH) ?? "";
  const originalFilename = decodeHeader(
    req,
    "x-video-filename",
    MAX_FILENAME_LENGTH,
  );
  const contentType = (req.get("content-type") ?? "").split(";", 1)[0]?.trim();
  const contentLength = Number(req.get("content-length") ?? "0");

  if (!title) {
    res.status(400).json({ error: "Video title is required" });
    return;
  }
  if (!originalFilename) {
    res.status(400).json({ error: "Video filename is required" });
    return;
  }
  if (!contentType?.startsWith("video/")) {
    res.status(415).json({ error: "Only video files are allowed" });
    return;
  }
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_SIZE) {
    res.status(413).json({ error: "Video exceeds the 500 MB upload limit" });
    return;
  }

  const filename = path.basename(originalFilename);
  const upload = getVideoBucket().openUploadStream(filename, {
    metadata: {
      title,
      description,
      contentType,
    },
  });

  let received = 0;

  try {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      received += buffer.length;
      if (received > MAX_VIDEO_SIZE) {
        throw new RangeError("Video exceeds the 500 MB upload limit");
      }

      if (!upload.write(buffer)) {
        await once(upload, "drain");
      }
    }

    if (received === 0) {
      throw new TypeError("Video file is empty");
    }

    upload.end();
    await once(upload, "finish");

    const file = await getVideoBucket().find({ _id: upload.id }).next();
    if (!file) {
      throw new Error("Uploaded video metadata was not found");
    }

    res.status(201).json(serializeVideo(file as StoredVideo));
  } catch (error) {
    if (!upload.done && !upload.state.aborted) {
      await upload.abort().catch(() => undefined);
    }

    if (error instanceof RangeError) {
      res.status(413).json({ error: error.message });
      return;
    }
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.head("/videos/:id/content", streamVideo);
router.get("/videos/:id/content", streamVideo);

router.delete("/videos/:id", async (req, res): Promise<void> => {
  const id = getVideoId(req);
  if (!id) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const bucket = getVideoBucket();
  const file = await bucket.find({ _id: id }).next();
  if (!file) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  await bucket.delete(id);
  res.sendStatus(204);
});

export default router;
