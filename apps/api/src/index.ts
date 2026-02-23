import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profiles";
import studioRoutes from "./routes/studio";
import productivityRoutes from "./routes/productivity";
import ironmanRoutes from "./routes/ironman";
import nutritionRoutes from "./routes/nutrition";
import financeRoutes from "./routes/finance";
import aiRoutes from "./routes/ai";
import dashboardRoutes from "./routes/dashboard";
import { authMiddleware, profileMiddleware } from "./middleware/auth";

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/auth/me", authMiddleware, authRoutes);
app.use("/api/profiles", authMiddleware, profileRoutes);

// Profile-scoped routes (require auth + profile ownership)
app.use(
  "/api/p/:profileId/studio",
  authMiddleware,
  profileMiddleware,
  studioRoutes
);
app.use(
  "/api/p/:profileId",
  authMiddleware,
  profileMiddleware,
  productivityRoutes
);
app.use(
  "/api/p/:profileId/ironman",
  authMiddleware,
  profileMiddleware,
  ironmanRoutes
);
app.use(
  "/api/p/:profileId/nutrition",
  authMiddleware,
  profileMiddleware,
  nutritionRoutes
);
app.use(
  "/api/p/:profileId/finance",
  authMiddleware,
  profileMiddleware,
  financeRoutes
);
app.use("/api/p/:profileId", authMiddleware, profileMiddleware, aiRoutes);
app.use(
  "/api/p/:profileId",
  authMiddleware,
  profileMiddleware,
  dashboardRoutes
);

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
