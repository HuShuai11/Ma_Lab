import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";

export const dynamic = "force-dynamic";

type MediaEnv = {
  MEDIA?: R2Bucket;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const numericId = Math.trunc(Number(id));
  if (!Number.isFinite(numericId) || numericId < 1) {
    return new Response("Not found", { status: 404 });
  }

  const [asset] = await getDb()
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, numericId))
    .limit(1);
  const bucket = (env as unknown as MediaEnv).MEDIA;
  if (!asset || !bucket) {
    return new Response("Not found", { status: 404 });
  }

  const object = await bucket.get(asset.objectKey);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", asset.contentType);
  headers.set("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
  headers.set("x-content-type-options", "nosniff");
  if (asset.contentType === "application/pdf") {
    headers.set(
      "content-disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(asset.filename)}`,
    );
  }
  return new Response(object.body, { headers });
}
