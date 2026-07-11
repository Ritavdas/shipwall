import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ProjectMediaKind } from "@/domain/media";
import { env } from "@/infra/env";

const UPLOAD_POLICIES = {
  "image/avif": { kind: "image", maxBytes: 8 * 1024 * 1024, extension: "avif" },
  "image/gif": { kind: "image", maxBytes: 8 * 1024 * 1024, extension: "gif" },
  "image/jpeg": { kind: "image", maxBytes: 8 * 1024 * 1024, extension: "jpg" },
  "image/png": { kind: "image", maxBytes: 8 * 1024 * 1024, extension: "png" },
  "image/webp": { kind: "image", maxBytes: 8 * 1024 * 1024, extension: "webp" },
  "application/pdf": {
    kind: "pdf",
    maxBytes: 20 * 1024 * 1024,
    extension: "pdf",
  },
  "video/mp4": { kind: "video", maxBytes: 50 * 1024 * 1024, extension: "mp4" },
  "video/quicktime": {
    kind: "video",
    maxBytes: 50 * 1024 * 1024,
    extension: "mov",
  },
  "video/webm": {
    kind: "video",
    maxBytes: 50 * 1024 * 1024,
    extension: "webm",
  },
} as const satisfies Record<
  string,
  { kind: ProjectMediaKind; maxBytes: number; extension: string }
>;

export type AllowedUploadType = keyof typeof UPLOAD_POLICIES;

export function getUploadPolicy(contentType: string) {
  return UPLOAD_POLICIES[contentType as AllowedUploadType] ?? null;
}

export async function createPresignedUpload(input: {
  githubId: string;
  filename: string;
  contentType: AllowedUploadType;
  size: number;
}) {
  const policy = UPLOAD_POLICIES[input.contentType];
  const filename = safeFilename(input.filename, policy.extension);
  const key = `project-media/${input.githubId}/${crypto.randomUUID()}-${filename}`;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.size,
    CacheControl: "public, max-age=31536000, immutable",
  });

  return {
    uploadUrl: await getSignedUrl(client, command, { expiresIn: 5 * 60 }),
    publicUrl: `${env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`,
    kind: policy.kind,
    maxBytes: policy.maxBytes,
  };
}

function safeFilename(filename: string, fallbackExtension: string) {
  const basename = filename.split(/[\\/]/).pop() || `upload.${fallbackExtension}`;
  const cleaned = basename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(-96);

  if (!cleaned) return `upload.${fallbackExtension}`;
  if (cleaned.includes(".")) return cleaned;
  return `${cleaned}.${fallbackExtension}`;
}
