import { uploadObject, deleteObject } from "./services/r2Storage";

describe("r2Storage helpers", () => {
  it("throws if R2 is not configured", async () => {
    await expect(
      uploadObject({
        key: "test-key",
        contentType: "text/plain",
        body: Buffer.from("test"),
      }),
    ).rejects.toThrow("Cloudflare R2 client is not configured");

    await expect(deleteObject("test-key")).rejects.toThrow("Cloudflare R2 client is not configured");
  });
});

