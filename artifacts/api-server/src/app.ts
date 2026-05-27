import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

app.use(limiter);
app.use("/api/auth", authLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(import.meta.dirname, "..", "uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendDir = path.join(import.meta.dirname, "..", "public");
  if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDir, "index.html"));
    });
  }
}

export default app;
