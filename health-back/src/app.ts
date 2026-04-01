import "express-async-errors";
import express from "express";
import cors from "cors";
import rbacRoutes from "./routes/rbacRoutes";
import authRoutes from "./routes/authRoutes";
import fileRoutes from "./routes/fileRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "health-back", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api", rbacRoutes);

app.use(errorHandler);

export default app;

