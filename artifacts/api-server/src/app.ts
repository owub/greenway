import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.sc-cdn.net",
          "https://*.snapchat.com",
        ],
        mediaSrc: [
          "'self'",
          "blob:",
          "https://*.sc-cdn.net",
          "https://*.snapchat.com",
        ],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use(limiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    req.path.startsWith("/api/") ? "no-store" : "no-cache",
  );

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  const expectedOrigin = `${req.protocol}://${req.host}`;
  const isSameOriginBrowserRequest =
    req.get("sec-fetch-site") === "same-origin";
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (
    origin !== expectedOrigin &&
    !isSameOriginBrowserRequest &&
    !allowedOrigins.includes(origin)
  ) {
    res.status(403).json({ error: "Cross-origin request rejected" });
    return;
  }
  next();
});

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

app.use("/api", router);

if (isProduction) {
  const frontendDir = path.join(import.meta.dirname, "..", "public");
  if (fs.existsSync(frontendDir)) {
    app.use(
      express.static(frontendDir, {
        etag: true,
        maxAge: "1y",
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
          }
        },
      }),
    );
    app.get("/{*splat}", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(frontendDir, "index.html"));
    });
  }
}

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err: error }, "Request failed");

    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    res.status(500).json({ error: "Request failed" });
  },
);

export default app;
