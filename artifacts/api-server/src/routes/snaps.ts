import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const SNAPCHAT_API_ORIGIN = "https://businessapi.snapchat.com/v1";
const SNAPCHAT_TOKEN_URL =
  "https://accounts.snapchat.com/login/oauth2/access_token";
const DEFAULT_USERNAME = "ekampreet.16";

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

interface SnapchatProfile {
  id?: unknown;
  username?: unknown;
  title?: unknown;
  display_name?: unknown;
  profile_image_url?: unknown;
}

interface SnapchatStory {
  id?: unknown;
  created_at?: unknown;
}

interface SnapchatSnap {
  id?: unknown;
  media_type?: unknown;
  media_url?: unknown;
  thumbnail_url?: unknown;
  snap_caption?: unknown;
  caption?: unknown;
  created_at?: unknown;
}

interface SnapchatApiResponse {
  public_profiles?: unknown;
  stories?: unknown;
  snaps?: unknown;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

const router: IRouter = Router();

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapCollection<T>(value: unknown, singularKey: string): T[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const wrapped = (entry as Record<string, unknown>)[singularKey];
    return [(wrapped ?? entry) as T];
  });
}

function hasRefreshCredentials(): boolean {
  return Boolean(
    process.env.SNAPCHAT_CLIENT_ID &&
    process.env.SNAPCHAT_CLIENT_SECRET &&
    process.env.SNAPCHAT_REFRESH_TOKEN,
  );
}

function isConfigured(): boolean {
  return Boolean(process.env.SNAPCHAT_ACCESS_TOKEN || hasRefreshCredentials());
}

async function getAccessToken(): Promise<string> {
  const directToken = asString(process.env.SNAPCHAT_ACCESS_TOKEN);
  if (directToken) return directToken;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = asString(process.env.SNAPCHAT_CLIENT_ID);
  const clientSecret = asString(process.env.SNAPCHAT_CLIENT_SECRET);
  const refreshToken = asString(process.env.SNAPCHAT_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Snapchat OAuth credentials are incomplete");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch(SNAPCHAT_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`Snapchat token refresh failed with ${response.status}`);
  }

  const result = (await response.json()) as TokenResponse;
  const accessToken = asString(result.access_token);
  if (!accessToken) {
    throw new Error("Snapchat token refresh returned no access token");
  }

  const expiresIn =
    typeof result.expires_in === "number" && Number.isFinite(result.expires_in)
      ? result.expires_in
      : 3_600;
  cachedToken = {
    value: accessToken,
    expiresAt: Date.now() + Math.max(expiresIn, 300) * 1_000,
  };

  return accessToken;
}

async function snapchatRequest(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<SnapchatApiResponse> {
  const url = new URL(`${SNAPCHAT_API_ORIGIN}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Snapchat Public Profile API request failed with ${response.status}`,
    );
  }

  return (await response.json()) as SnapchatApiResponse;
}

async function resolveProfile(
  accessToken: string,
  username: string,
): Promise<SnapchatProfile> {
  const configuredId = asString(process.env.SNAPCHAT_PROFILE_ID);
  if (configuredId) {
    return {
      id: configuredId,
      username,
      title: process.env.SNAPCHAT_DISPLAY_NAME,
    };
  }

  const result = await snapchatRequest("/public_profiles", accessToken, {
    includeStandard: "true",
    limit: "50",
    searchTerm: username,
  });
  const profiles = unwrapCollection<SnapchatProfile>(
    result.public_profiles,
    "public_profile",
  );
  const exactMatch = profiles.find(
    (profile) => asString(profile.username)?.toLowerCase() === username,
  );
  const profile = exactMatch ?? profiles[0];

  if (!profile || !asString(profile.id)) {
    throw new Error(`Snapchat profile @${username} was not found`);
  }

  return profile;
}

async function listStorySnaps(
  accessToken: string,
  profileId: string,
  story: SnapchatStory,
): Promise<SnapchatSnap[]> {
  const storyId = asString(story.id);
  if (!storyId) return [];

  const result = await snapchatRequest(
    `/public_profiles/${encodeURIComponent(profileId)}/stories/${encodeURIComponent(storyId)}/snaps`,
    accessToken,
    { limit: "100" },
  );

  return unwrapCollection<SnapchatSnap>(result.snaps, "snap");
}

router.get("/snaps", async (_req, res): Promise<void> => {
  const username = (
    asString(process.env.SNAPCHAT_USERNAME) ?? DEFAULT_USERNAME
  ).toLowerCase();
  const profileUrl = `https://www.snapchat.com/add/${encodeURIComponent(username)}`;
  const basePayload = {
    account: {
      username,
      displayName: asString(process.env.SNAPCHAT_DISPLAY_NAME),
      profileImageUrl: null,
    },
    profileUrl,
    fetchedAt: new Date().toISOString(),
  };

  if (!isConfigured()) {
    res.json({
      ...basePayload,
      configured: false,
      snaps: [],
    });
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const profile = await resolveProfile(accessToken, username);
    const profileId = asString(profile.id);
    if (!profileId) {
      throw new Error("Snapchat profile ID is missing");
    }

    const storiesResult = await snapchatRequest(
      `/public_profiles/${encodeURIComponent(profileId)}/stories`,
      accessToken,
      { limit: "20" },
    );
    const stories = unwrapCollection<SnapchatStory>(
      storiesResult.stories,
      "story",
    );
    const storySnaps = await Promise.all(
      stories
        .slice(0, 10)
        .map((story) => listStorySnaps(accessToken, profileId, story)),
    );

    const snaps = storySnaps
      .flat()
      .flatMap((snap, index) => {
        const mediaUrl = asString(snap.media_url);
        if (!mediaUrl) return [];

        const mediaType = asString(snap.media_type)?.toLowerCase();
        const postedAt = asString(snap.created_at) ?? new Date().toISOString();

        return [
          {
            id: asString(snap.id) ?? `snap-${index}-${postedAt}`,
            mediaUrl,
            thumbnailUrl: asString(snap.thumbnail_url),
            type: mediaType?.includes("video") ? "video" : "image",
            caption:
              asString(snap.snap_caption) ?? asString(snap.caption) ?? null,
            postedAt,
          },
        ];
      })
      .sort(
        (left, right) =>
          new Date(right.postedAt).getTime() -
          new Date(left.postedAt).getTime(),
      );

    res.setHeader(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=30",
    );
    res.json({
      configured: true,
      account: {
        username: asString(profile.username) ?? username,
        displayName:
          asString(profile.title) ??
          asString(profile.display_name) ??
          asString(process.env.SNAPCHAT_DISPLAY_NAME),
        profileImageUrl: asString(profile.profile_image_url),
      },
      profileUrl,
      fetchedAt: new Date().toISOString(),
      snaps,
    });
  } catch (error) {
    logger.warn({ err: error }, "Snapchat feed request failed");
    res.status(502).json({
      ...basePayload,
      configured: true,
      snaps: [],
      error: "Live snaps are temporarily unavailable.",
    });
  }
});

export default router;
