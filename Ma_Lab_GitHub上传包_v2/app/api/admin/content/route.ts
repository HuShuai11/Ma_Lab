import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, contentItems } from "@/db/schema";
import {
  assertCsrf,
  jsonError,
  requireApiAdmin,
} from "@/lib/admin-auth";
import {
  CONTENT_TYPES,
  ensureSeedContent,
  parsePayload,
  type ContentType,
  type ContentVisibility,
} from "@/lib/site-content";

export const dynamic = "force-dynamic";

const VISIBILITIES = ["visible", "hidden", "deleted"] as const;

function cleanSlug(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function cleanPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function serializeRow(row: typeof contentItems.$inferSelect) {
  return { ...row, payload: parsePayload(row.payload) };
}

export async function GET(request: Request) {
  try {
    await requireApiAdmin(request);
    await ensureSeedContent();
    const rows = await getDb()
      .select()
      .from(contentItems)
      .orderBy(asc(contentItems.type), asc(contentItems.sortOrder), asc(contentItems.id));
    return Response.json({ items: rows.map(serializeRow) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireApiAdmin(request);
    assertCsrf(request, identity);
    const body = (await request.json()) as Record<string, unknown>;
    const type = String(body.type ?? "") as ContentType;
    const title = String(body.title ?? "").trim().slice(0, 300);
    const slug = cleanSlug(body.slug || title);
    const payload = cleanPayload(body.payload);
    const sortOrder = Number.isFinite(Number(body.sortOrder))
      ? Math.max(0, Math.trunc(Number(body.sortOrder)))
      : 0;
    const visibility = VISIBILITIES.includes(
      body.visibility as ContentVisibility,
    )
      ? (body.visibility as ContentVisibility)
      : "visible";

    if (!CONTENT_TYPES.includes(type) || !title || !slug) {
      return Response.json(
        { error: "请填写完整的内容类型、标题和标识。" },
        { status: 400 },
      );
    }

    const [created] = await getDb()
      .insert(contentItems)
      .values({
        type,
        title,
        slug,
        payload: JSON.stringify(payload),
        sortOrder,
        visibility,
        createdBy: identity.id,
        updatedBy: identity.id,
      })
      .returning();

    await getDb().insert(auditLogs).values({
      adminUserId: identity.id,
      action: "create",
      entityType: type,
      entityId: String(created.id),
      afterJson: JSON.stringify(serializeRow(created)),
    });
    return Response.json({ item: serializeRow(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const identity = await requireApiAdmin(request);
    assertCsrf(request, identity);
    const body = (await request.json()) as Record<string, unknown>;
    const id = Math.trunc(Number(body.id));
    const expectedRevision = Math.trunc(Number(body.revision));
    if (!Number.isFinite(id) || id < 1) {
      return Response.json({ error: "无效的内容编号。" }, { status: 400 });
    }
    if (!Number.isFinite(expectedRevision) || expectedRevision < 1) {
      return Response.json(
        { error: "内容版本无效，请刷新页面后重新编辑。" },
        { status: 409 },
      );
    }

    const [existing] = await getDb()
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, id))
      .limit(1);
    if (!existing) {
      return Response.json({ error: "未找到需要修改的内容。" }, { status: 404 });
    }

    const title = String(body.title ?? existing.title).trim().slice(0, 300);
    const slug = cleanSlug(body.slug ?? existing.slug);
    const payload =
      body.payload === undefined ? parsePayload(existing.payload) : cleanPayload(body.payload);
    const sortOrder = Number.isFinite(Number(body.sortOrder))
      ? Math.max(0, Math.trunc(Number(body.sortOrder)))
      : existing.sortOrder;
    const visibility = VISIBILITIES.includes(
      body.visibility as ContentVisibility,
    )
      ? (body.visibility as ContentVisibility)
      : (existing.visibility as ContentVisibility);

    if (!title || !slug) {
      return Response.json(
        { error: "标题和标识不能为空。" },
        { status: 400 },
      );
    }

    const [updated] = await getDb()
      .update(contentItems)
      .set({
        title,
        slug,
        payload: JSON.stringify(payload),
        sortOrder,
        visibility,
        deletedAt:
          visibility === "deleted"
            ? existing.deletedAt ?? new Date().toISOString()
            : null,
        updatedBy: identity.id,
        updatedAt: new Date().toISOString(),
        revision: existing.revision + 1,
      })
      .where(
        and(
          eq(contentItems.id, id),
          eq(contentItems.revision, expectedRevision),
        ),
      )
      .returning();
    if (!updated) {
      return Response.json(
        { error: "这条内容刚刚被其他管理员更新，请刷新页面后重新编辑。" },
        { status: 409 },
      );
    }

    await getDb().insert(auditLogs).values({
      adminUserId: identity.id,
      action: visibility === "deleted" ? "delete" : "update",
      entityType: existing.type,
      entityId: String(id),
      beforeJson: JSON.stringify(serializeRow(existing)),
      afterJson: JSON.stringify(serializeRow(updated)),
    });
    return Response.json({ item: serializeRow(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
