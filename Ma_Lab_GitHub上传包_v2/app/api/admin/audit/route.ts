import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminUsers, auditLogs } from "@/db/schema";
import { jsonError, requireApiAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiAdmin(request);
    const logs = await getDb()
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        createdAt: auditLogs.createdAt,
        username: adminUsers.username,
      })
      .from(auditLogs)
      .innerJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(100);
    return Response.json({
      logs: logs.map((log) => ({
        ...log,
        username: log.username ?? "legacy-admin",
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
