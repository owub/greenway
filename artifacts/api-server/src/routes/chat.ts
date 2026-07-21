import { Router, type IRouter } from "express";
import { MessageModel } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { getChatAlias, requireUser } from "../middlewares/session";

const router: IRouter = Router();

function serializeMessage(message: InstanceType<typeof MessageModel>) {
  return {
    id: message.id as string,
    author: message.author,
    text: message.text,
    createdAt: (message.createdAt as Date).toISOString(),
  };
}

router.use("/chat", requireUser);

router.get("/chat/messages", async (_req, res): Promise<void> => {
  const messages = await MessageModel.find().sort({ createdAt: -1 }).limit(100);
  res.json(messages.reverse().map(serializeMessage));
});

router.post("/chat/messages", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Message must be between 1 and 500 characters" });
    return;
  }

  const text = parsed.data.text.replace(/\r\n/g, "\n").trim();
  if (!text) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const message = await MessageModel.create({
    author: getChatAlias(req),
    text,
  });

  res.status(201).json(serializeMessage(message));
});

export default router;
