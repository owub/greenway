import app from "./app";
import { connectDB, purgeLegacyBiometricData } from "@workspace/db";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

for (const name of ["MONGODB_URI", "SITE_PASSWORD", "SESSION_SECRET"] as const) {
  if (!process.env[name]) {
    throw new Error(`${name} environment variable is required`);
  }
}

connectDB()
  .then(async () => {
    logger.info("Connected to MongoDB");
    await purgeLegacyBiometricData();
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });
