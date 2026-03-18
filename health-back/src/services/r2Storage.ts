import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  // eslint-disable-next-line no-console
  console.warn("Cloudflare R2 is not fully configured. Check R2_* environment variables.");
}

const r2Client =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : undefined;

export async function uploadObject(params: {
  key: string;
  contentType: string;
  body: Buffer;
}): Promise<string> {
  if (!r2Client || !bucketName) {
    throw new Error("Cloudflare R2 client is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await r2Client.send(command);

  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(params.key)}`;
  }

  // Fallback to signed URL valid for a limited time
  return getSignedUrl(r2Client, command, { expiresIn: 60 * 60 });
}

export async function deleteObject(key: string): Promise<void> {
  if (!r2Client || !bucketName) {
    throw new Error("Cloudflare R2 client is not configured");
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2Client.send(command);
}

