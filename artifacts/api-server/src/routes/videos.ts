import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { ApprovalModel, VideoModel } from "@workspace/db";

const uploadsDir = path.join(import.meta.dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

const router: IRouter = Router();

async function isAuthorized(sessionToken: string | undefined, authHeader: string | undefined): Promise<boolean> {
  const token = sessionToken || authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const approval = await ApprovalModel.findOne({ sessionToken: token });
  return !!approval && approval.status === "approved";
}

function serializeVideo(video: InstanceType<typeof VideoModel>, baseUrl: string) {
  return {
    id: video.id as string,
    title: video.title,
    description: video.description ?? null,
    filename: video.filename,
    fileUrl: `${baseUrl}/api/uploads/${video.filename}`,
    createdAt: (video.createdAt as Date).toISOString(),
  };
}

router.get("/videos/stats", async (_req, res): Promise<void> => {
  const totalVideos = await VideoModel.countDocuments();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentUploads = await VideoModel.countDocuments({ createdAt: { $gte: oneWeekAgo } });
  res.json({ totalVideos, recentUploads });
});

router.get("/videos", async (req, res): Promise<void> => {
  const sessionToken = req.query.sessionToken as string | undefined;
  const authorized = await isAuthorized(sessionToken, req.headers.authorization);
  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const videos = await VideoModel.find().sort({ createdAt: -1 });
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json(videos.map((v) => serializeVideo(v, baseUrl)));
});

router.post("/videos/upload", upload.single("file"), async (req, res): Promise<void> => {
  const sessionToken = req.body.sessionToken as string | undefined;
  const authorized = await isAuthorized(sessionToken, req.headers.authorization);
  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No video file provided" });
    return;
  }

  const title = req.body.title as string;
  const description = req.body.description as string | undefined;

  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const video = await VideoModel.create({
    title: title.trim(),
    description: description?.trim() || null,
    filename: req.file.filename,
  });

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.status(201).json(serializeVideo(video, baseUrl));
});

router.get("/videos/:id", async (req, res): Promise<void> => {
  const sessionToken = req.query.sessionToken as string | undefined;
  const authorized = await isAuthorized(sessionToken, req.headers.authorization);
  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const video = await VideoModel.findById(req.params.id).catch(() => null);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json(serializeVideo(video, baseUrl));
});

router.delete("/videos/:id", async (req, res): Promise<void> => {
  const video = await VideoModel.findByIdAndDelete(req.params.id).catch(() => null);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const filePath = path.join(uploadsDir, video.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.sendStatus(204);
});

export default router;
