import express from "express";
import cors from "cors";
import rbacRoutes from "./routes/rbacRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "health-back", timestamp: new Date().toISOString() });
});

app.use("/api", rbacRoutes);

export default app;

