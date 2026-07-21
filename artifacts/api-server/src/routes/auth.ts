import { Router, type IRouter } from "express";
import { VerifyPasswordBody } from "@workspace/api-zod";
import {
  clearUserSession,
  getUserIdentity,
  issueUserSession,
  matchesSitePassword,
} from "../middlewares/session";

const router: IRouter = Router();

router.post("/auth/verify-password", (req, res): void => {
  const parsed = VerifyPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const valid = matchesSitePassword(parsed.data.password);
  if (valid) issueUserSession(res);
  else clearUserSession(res);
  res.json({ valid });
});

router.get("/auth/status", (req, res): void => {
  res.json({ status: getUserIdentity(req) ? "approved" : "none" });
});

router.post("/auth/logout", (_req, res): void => {
  clearUserSession(res);
  res.json({ ok: true });
});

export default router;
