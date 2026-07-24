import { Router, type IRouter } from "express";
import { MongoClient, type Collection } from "mongodb";

interface VideoLikeDocument {
  _id?: unknown;
  videoId: string;
  count: number;
  createdAt: Date;
}

interface VideoCommentDocument {
  _id?: unknown;
  videoId: string;
  body: string;
  createdAt: Date;
}

interface Collections {
  likes: Collection<VideoLikeDocument>;
  comments: Collection<VideoCommentDocument>;
}

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017";
const MONGO_DB = process.env.MONGO_DB ?? "greenway";
const client = new MongoClient(MONGO_URI);
let collectionsPromise: Promise<Collections> | null = null;

async function getCollections(): Promise<Collections> {
  if (!collectionsPromise) {
    collectionsPromise = (async () => {
      await client.connect();
      const db = client.db(MONGO_DB);
      const likes = db.collection<VideoLikeDocument>("video_likes");
      const comments = db.collection<VideoCommentDocument>("video_comments");
      await likes.createIndex({ videoId: 1 }, { unique: true });
      await comments.createIndex({ videoId: 1 });
      return { likes, comments };
    })();
  }
  return collectionsPromise;
}

const router: IRouter = Router();

function isValidVideoId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

router.get("/:videoId/likes", async (req, res) => {
  const videoId = req.params.videoId;
  if (!isValidVideoId(videoId)) {
    res.status(400).json({ error: "Missing video ID" });
    return;
  }

  try {
    const { likes } = await getCollections();
    const existing = await likes.findOne({ videoId });
    res.json({ count: existing?.count ?? 0 });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch like count" });
  }
});

router.post("/:videoId/likes", async (req, res) => {
  const videoId = req.params.videoId;
  if (!isValidVideoId(videoId)) {
    res.status(400).json({ error: "Missing video ID" });
    return;
  }

  try {
    const { likes } = await getCollections();
    const result = await likes.findOneAndUpdate(
      { videoId },
      {
        $inc: { count: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" },
    );

    res.json({ count: result.value?.count ?? 0 });
  } catch (error) {
    res.status(500).json({ error: "Could not increment like count" });
  }
});

router.get("/:videoId/comments", async (req, res) => {
  const videoId = req.params.videoId;
  if (!isValidVideoId(videoId)) {
    res.status(400).json({ error: "Missing video ID" });
    return;
  }

  try {
    const { comments } = await getCollections();
    const rows = await comments
      .find({ videoId })
      .sort({ createdAt: 1 })
      .toArray();

    res.json(
      rows.map((comment) => ({
        id: comment._id?.toString() ?? videoId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Could not load comments" });
  }
});

router.post("/:videoId/comments", async (req, res) => {
  const videoId = req.params.videoId;
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";

  if (!isValidVideoId(videoId) || !body) {
    res.status(400).json({ error: "Missing video ID or comment body" });
    return;
  }

  if (body.length > 240) {
    res.status(400).json({ error: "Comment is too long" });
    return;
  }

  try {
    const { comments } = await getCollections();
    const inserted = await comments.insertOne({
      videoId,
      body,
      createdAt: new Date(),
    });

    res.status(201).json({
      id: inserted.insertedId.toString(),
      body,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Could not add comment" });
  }
});

export default router;
