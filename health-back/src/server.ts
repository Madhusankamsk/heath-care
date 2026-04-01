import "dotenv/config";
import http from "http";
import app from "./app";

/** Log stray promise rejections (e.g. fire-and-forget async) without relying on process exit. */
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled promise rejection:", promise, reason);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Health backend listening on port ${PORT}`);
});

