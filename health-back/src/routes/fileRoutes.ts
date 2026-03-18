import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { uploadObject, deleteObject } from "../services/r2Storage";

const router = Router();

router.post("/upload", requireAuth, async (req, res) => {
  const chunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks);
      const key = req.headers["x-file-key"];
      const contentType = (req.headers["content-type"] as string) || "application/octet-stream";

      if (!key || Array.isArray(key)) {
        return res.status(400).json({ message: "x-file-key header is required" });
      }

      const url = await uploadObject({
        key: String(key),
        contentType,
        body,
      });

      return res.status(201).json({ url });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("R2 upload error", error);
      return res.status(500).json({ message: "Failed to upload file" });
    }
  });
});

router.delete("/:key", requireAuth, async (req, res) => {
  const { key } = req.params;

  try {
    await deleteObject(key);
    return res.status(204).send();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("R2 delete error", error);
    return res.status(500).json({ message: "Failed to delete file" });
  }
});

export default router;

