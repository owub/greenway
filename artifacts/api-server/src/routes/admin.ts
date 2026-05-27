import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { ApprovalModel } from "@workspace/db";
import {
  AdminLoginBody,
  ApproveUserParams,
  ApproveUserQueryParams,
  DenyUserParams,
  DenyUserQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const VALID_ADMIN_TOKENS = new Set<string>();

function serializeApproval(a: InstanceType<typeof ApprovalModel>) {
  return {
    id: a.id as string,
    sessionId: a.sessionId,
    faceImageData: a.faceImageData ?? null,
    status: a.status,
    ipAddress: a.ipAddress ?? null,
    deviceInfo: a.deviceInfo ?? null,
    surveillanceCaptureCount: (a.surveillanceCaptures ?? []).length,
    createdAt: (a.createdAt as Date).toISOString(),
  };
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "navtanlol";
  if (parsed.data.password !== adminPassword) {
    res.json({ valid: false, adminToken: null });
    return;
  }

  const token = randomUUID();
  VALID_ADMIN_TOKENS.add(token);
  res.json({ valid: true, adminToken: token });
});

router.get("/admin/pending", async (req, res): Promise<void> => {
  const adminToken = req.query.adminToken as string | undefined;
  if (!adminToken || !VALID_ADMIN_TOKENS.has(adminToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const approvals = await ApprovalModel.find().sort({ createdAt: -1 });
  res.json(approvals.map(serializeApproval));
});

router.post("/admin/approvals/:sessionId/approve", async (req, res): Promise<void> => {
  const pathParsed = ApproveUserParams.safeParse(req.params);
  if (!pathParsed.success) { res.status(400).json({ error: pathParsed.error.message }); return; }

  const queryParsed = ApproveUserQueryParams.safeParse(req.query);
  const adminToken = queryParsed.success ? queryParsed.data.adminToken : (req.query.adminToken as string | undefined);
  if (!adminToken || !VALID_ADMIN_TOKENS.has(adminToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessionToken = randomUUID();
  const approval = await ApprovalModel.findOneAndUpdate(
    { sessionId: pathParsed.data.sessionId },
    { status: "approved", sessionToken },
    { new: true },
  );

  if (!approval) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(serializeApproval(approval));
});

router.post("/admin/approvals/:sessionId/deny", async (req, res): Promise<void> => {
  const pathParsed = DenyUserParams.safeParse(req.params);
  if (!pathParsed.success) { res.status(400).json({ error: pathParsed.error.message }); return; }

  const queryParsed = DenyUserQueryParams.safeParse(req.query);
  const adminToken = queryParsed.success ? queryParsed.data.adminToken : (req.query.adminToken as string | undefined);
  if (!adminToken || !VALID_ADMIN_TOKENS.has(adminToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const approval = await ApprovalModel.findOneAndUpdate(
    { sessionId: pathParsed.data.sessionId },
    { status: "denied" },
    { new: true },
  );

  if (!approval) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(serializeApproval(approval));
});

export default router;
