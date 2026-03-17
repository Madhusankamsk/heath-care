import "dotenv/config";
import http from "http";
import app from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Health backend listening on port ${PORT}`);
});

