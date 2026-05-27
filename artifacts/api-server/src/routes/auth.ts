import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { ApprovalModel } from "@workspace/db";
import {
  VerifyPasswordBody,
  GetAuthStatusParams,
  SubmitFaceScanBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/verify-password", async (req, res): Promise<void> => {
  const parsed = VerifyPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sitePassword = process.env.SITE_PASSWORD ?? "";
  const valid = parsed.data.password === sitePassword;
  res.json({ valid });
});

router.post("/auth/face-scan", async (req, res): Promise<void> => {
  const parsed = SubmitFaceScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionId = randomUUID();
  const { imageData } = parsed.data;

  await ApprovalModel.create({
    sessionId,
    faceImageData: imageData,
    status: "pending",
  });

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const boundary = "----GreenWaysBoundary";
      const messageJson = JSON.stringify({
        content: `**Greenways Access Request**\nSession: \`${sessionId}\`\nApprove or deny at: ${req.protocol}://${req.get("host")}/admin`,
      });
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\n\r\n`),
        Buffer.from(messageJson),
        Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="face.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      });
    } catch (err) {
      req.log.warn({ err }, "Discord webhook failed");
    }
  }

  res.status(201).json({ sessionId });
});

router.get("/auth/status/:sessionId", async (req, res): Promise<void> => {
  const params = GetAuthStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const approval = await ApprovalModel.findOne({ sessionId: params.data.sessionId });
  if (!approval) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    sessionId: approval.sessionId,
    status: approval.status,
    sessionToken: approval.sessionToken ?? null,
  });
});

export default router;
