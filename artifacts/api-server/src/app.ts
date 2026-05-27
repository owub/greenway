import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(import.meta.dirname, "..", "uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

// In production, serve the built Vite frontend and handle SPA routing
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
