import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db, approvalsTable } from "@workspace/db";
import {
  AdminLoginBody,
  ApproveUserParams,
  DenyUserParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const VALID_ADMIN_TOKENS = new Set<string>();

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? "greenways_admin_2024";
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

  const approvals = await db
    .select()
    .from(approvalsTable)
    .where(inArray(approvalsTable.status, ["pending", "approved", "denied"]));

  res.json(
    approvals.map((a) => ({
      ...a,
      faceImageData: a.faceImageData ?? null,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/approvals/:sessionId/approve", async (req, res): Promise<void> => {
  const params = ApproveUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const adminToken = req.query.adminToken as string | undefined;
  if (!adminToken || !VALID_ADMIN_TOKENS.has(adminToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessionToken = randomUUID();

  const [approval] = await db
    .update(approvalsTable)
    .set({ status: "approved", sessionToken })
    .where(eq(approvalsTable.sessionId, params.data.sessionId))
    .returning();

  if (!approval) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    ...approval,
    faceImageData: approval.faceImageData ?? null,
    createdAt: approval.createdAt.toISOString(),
  });
});

router.post("/admin/approvals/:sessionId/deny", async (req, res): Promise<void> => {
  const params = DenyUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const adminToken = req.query.adminToken as string | undefined;
  if (!adminToken || !VALID_ADMIN_TOKENS.has(adminToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [approval] = await db
    .update(approvalsTable)
    .set({ status: "denied" })
    .where(eq(approvalsTable.sessionId, params.data.sessionId))
    .returning();

  if (!approval) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    ...approval,
    faceImageData: approval.faceImageData ?? null,
    createdAt: approval.createdAt.toISOString(),
  });
});

export default router;
