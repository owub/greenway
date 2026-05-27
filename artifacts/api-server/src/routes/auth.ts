import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { ApprovalModel } from "@workspace/db";
import {
  VerifyPasswordBody,
  GetAuthStatusParams,
  SubmitFaceScanBody,
  SubmitSurveillanceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  return req.ip ?? "unknown";
}

async function sendDiscordWebhook(webhookUrl: string, content: string, imageBase64?: string, filename = "capture.jpg") {
  try {
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const boundary = "----GWBoundary";
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\n\r\n`),
        Buffer.from(JSON.stringify({ content })),
        Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      });
    } else {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }
  } catch {
    // silent
  }
}

router.post("/auth/verify-password", async (req, res): Promise<void> => {
  const parsed = VerifyPasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const valid = parsed.data.password === (process.env.SITE_PASSWORD ?? "");
  res.json({ valid });
});

router.post("/auth/face-scan", async (req, res): Promise<void> => {
  const parsed = SubmitFaceScanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const sessionId = randomUUID();
  const ip = getClientIp(req as Parameters<typeof getClientIp>[0]);
  const { imageData, deviceInfo } = parsed.data;

  await ApprovalModel.create({
    sessionId,
    faceImageData: imageData,
    status: "pending",
    ipAddress: ip,
    deviceInfo: deviceInfo ?? null,
  });

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    const ua = deviceInfo?.userAgent ?? req.headers["user-agent"] ?? "unknown";
    const screen = deviceInfo ? `${deviceInfo.screenWidth}×${deviceInfo.screenHeight}` : "unknown";
    const tz = deviceInfo?.timezone ?? "unknown";
    const platform = deviceInfo?.platform ?? "unknown";
    const content = [
      `🔐 **Greenways Access Request**`,
      `🪪 Session: \`${sessionId}\``,
      `🌐 IP: \`${ip}\``,
      `💻 Platform: \`${platform}\`  |  Screen: \`${screen}\``,
      `🕐 Timezone: \`${tz}\``,
      `🌍 UA: \`${ua.slice(0, 120)}\``,
      `📋 Approve/Deny: \`/admin\``,
    ].join("\n");
    await sendDiscordWebhook(webhookUrl, content, imageData, `face-${sessionId.slice(0, 8)}.jpg`);
  }

  res.status(201).json({ sessionId });
});

router.get("/auth/status/:sessionId", async (req, res): Promise<void> => {
  const params = GetAuthStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const approval = await ApprovalModel.findOne({ sessionId: params.data.sessionId });
  if (!approval) { res.status(404).json({ error: "Session not found" }); return; }

  res.json({
    sessionId: approval.sessionId,
    status: approval.status,
    sessionToken: approval.sessionToken ?? null,
  });
});

router.post("/auth/surveillance", async (req, res): Promise<void> => {
  const parsed = SubmitSurveillanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { sessionToken, imageData } = parsed.data;
  const approval = await ApprovalModel.findOne({ sessionToken, status: "approved" });
  if (!approval) { res.status(401).json({ error: "Unauthorized" }); return; }

  await ApprovalModel.findByIdAndUpdate(approval._id, {
    $push: {
      surveillanceCaptures: {
        $each: [{ imageData, timestamp: new Date() }],
        $slice: -20,
      },
    },
  });

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    const ip = getClientIp(req as Parameters<typeof getClientIp>[0]);
    const content = [
      `📸 **Surveillance Capture** — Greenways`,
      `🪪 Session: \`${approval.sessionId}\``,
      `🌐 IP: \`${ip}\`  |  ⏰ \`${new Date().toISOString()}\``,
    ].join("\n");
    await sendDiscordWebhook(webhookUrl, content, imageData, `surveillance-${Date.now()}.jpg`);
  }

  res.json({ ok: true });
});

export default router;
