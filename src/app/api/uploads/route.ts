import { z } from "zod";
import { auth } from "@/infra/auth";
import { flags } from "@/infra/env";
import {
  createPresignedUpload,
  getUploadPolicy,
  type AllowedUploadType,
} from "@/infra/uploads";

const Body = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(100),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.githubId || !session.login) {
    return Response.json(
      { error: "Sign in with GitHub before uploading project media." },
      { status: 401 },
    );
  }
  if (!flags.hasUploads) {
    return Response.json(
      { error: "Media uploads are not configured yet. Add a public media URL instead." },
      { status: 503 },
    );
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Choose a valid media file." }, { status: 400 });
  }

  const policy = getUploadPolicy(parsed.data.contentType);
  if (!policy) {
    return Response.json(
      { error: "Use an image, PDF, MP4, MOV, or WebM file." },
      { status: 415 },
    );
  }
  if (parsed.data.size > policy.maxBytes) {
    return Response.json(
      {
        error: `That file is too large. The ${policy.kind} limit is ${Math.round(
          policy.maxBytes / 1024 / 1024,
        )} MB.`,
      },
      { status: 413 },
    );
  }

  const upload = await createPresignedUpload({
    githubId: session.githubId,
    filename: parsed.data.filename,
    contentType: parsed.data.contentType as AllowedUploadType,
    size: parsed.data.size,
  });
  return Response.json(upload, {
    headers: { "Cache-Control": "no-store" },
  });
}
