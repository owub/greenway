import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

const USER_COOKIE = "hate_session";
const USER_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return secret;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce<Record<string, string>>((cookies, pair) => {
    const separator = pair.indexOf("=");
    if (separator < 0) return cookies;

    const key = pair.slice(0, separator).trim();
    const rawValue = pair.slice(separator + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawValue);
    } catch {
      cookies[key] = rawValue;
    }
    return cookies;
  }, {});
}

function secureCompare(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signSession(identity: string): string {
  const expiresAt = Date.now() + USER_SESSION_MS;
  const payload = Buffer.from(`user:${identity}:${expiresAt}`).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(raw: string | undefined): string | null {
  if (!raw) return null;
  const [payload, signature, ...rest] = raw.split(".");
  if (!payload || !signature || rest.length > 0) return null;

  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  if (!secureCompare(signature, expected)) return null;

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    if (!decoded.startsWith("user:")) return null;

    const lastSeparator = decoded.lastIndexOf(":");
    const expiresAt = Number(decoded.slice(lastSeparator + 1));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    return decoded.slice(5, lastSeparator);
  } catch {
    return null;
  }
}

export function matchesSitePassword(candidate: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) throw new Error("SITE_PASSWORD is required");
  return secureCompare(candidate, expected);
}

export function issueUserSession(res: Response): void {
  const identity = randomBytes(24).toString("base64url");
  res.cookie(USER_COOKIE, signSession(identity), cookieOptions(USER_SESSION_MS));
}

export function clearUserSession(res: Response): void {
  res.clearCookie(USER_COOKIE, cookieOptions(0));
}

export function getUserIdentity(req: Request): string | null {
  return verifySession(parseCookies(req)[USER_COOKIE]);
}

export function getChatAlias(req: Request): string {
  const identity = getUserIdentity(req);
  if (!identity) throw new Error("Authenticated identity required");
  const suffix = createHash("sha256").update(identity).digest("hex").slice(0, 6);
  return `anon_${suffix}`;
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!getUserIdentity(req)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
