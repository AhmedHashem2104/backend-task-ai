import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health";
import { sequencesRouter } from "./routes/sequences";
import { tovConfigsRouter } from "./routes/tov-configs";
import { prospectsRouter } from "./routes/prospects";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging in development
if (env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });
}

// Routes
app.use("/api/health", healthRouter);
app.use("/api/sequences", sequencesRouter);
app.use("/api/tov-configs", tovConfigsRouter);
app.use("/api/prospects", prospectsRouter);

// 404 catch-all for unmatched /api routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global error handler (must be after routes)
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[Error] Port ${env.PORT} is already in use.\n` +
        `Another instance may still be running.\n` +
        `Kill the process using port ${env.PORT} and try again.\n`
    );
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

export default app;
