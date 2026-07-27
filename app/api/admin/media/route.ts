import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { auditLogs, mediaAssets } from "@/db/schema";
import {
  assertCsrf,
  jsonError,
  requireApiAdmin,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

type MediaEnv = {
  MEDIA?: R2Bucket;
};

function safeFilename(filename: string) {
  const parts = filename.split(".");
  const extension =
    parts.length > 1
      ? `.${parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}`
      : "";
  const base = parts
    .join(".")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${base || "asset"}${extension}`;
}

export async function POST(request: Request) {
  try {
    const identity = await requireApiAdmin(request);
    assertCsrf(request, identity);
    const bucket = (env as unknown as MediaEnv).MEDIA;
    if (!bucket) {
      return Response.json(
        { error: "图片存储尚未启用。" },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const altText = String(formData.get("altText") ?? "").trim().slice(0, 200);
    if (!(file instanceof File)) {
      return Response.json({ error: "请选择需要上传的文件。" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size < 1 || file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "仅支持 JPG、PNG、WebP、GIF 或 PDF，文件不能超过 8MB。" },
        { status: 400 },
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const objectKey = `uploads/${date}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    await bucket.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        uploader: String(identity.id),
        originalName: encodeURIComponent(file.name),
      },
    });

    const [asset] = await getDb()
      .insert(mediaAssets)
      .values({
        objectKey,
        filename: file.name,
        contentType: file.type,
        byteSize: file.size,
        altText,
        uploadedBy: identity.id,
      })
      .returning();
    await getDb().insert(auditLogs).values({
      adminUserId: identity.id,
      action: "upload",
      entityType: "media",
      entityId: String(asset.id),
      afterJson: JSON.stringify({
        filename: asset.filename,
        contentType: asset.contentType,
        byteSize: asset.byteSize,
      }),
    });

    return Response.json(
      {
        asset: {
          id: asset.id,
          filename: asset.filename,
          contentType: asset.contentType,
          byteSize: asset.byteSize,
          altText: asset.altText,
          url: `/media/${asset.id}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
