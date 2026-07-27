import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminUsers, auditLogs } from "@/db/schema";
import {
  assertCsrf,
  assertOwner,
  createPasswordCredentials,
  deleteUserSessions,
  jsonError,
  normalizeUsername,
  passwordProblem,
  requireApiAdmin,
  usernameProblem,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function publicUser(row: typeof adminUsers.$inferSelect) {
  return {
    id: row.id,
    username: row.username ?? row.githubLogin,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const identity = await requireApiAdmin(request);
    assertOwner(identity);
    const rows = await getDb()
      .select()
      .from(adminUsers)
      .orderBy(asc(adminUsers.role), asc(adminUsers.username), asc(adminUsers.id));
    return Response.json({ users: rows.map(publicUser) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireApiAdmin(request);
    assertOwner(identity);
    assertCsrf(request, identity);
    const body = (await request.json()) as Record<string, unknown>;
    const username = normalizeUsername(body.username);
    const displayName = String(body.displayName ?? "").trim().slice(0, 80);
    const password = String(body.password ?? "");
    const role = body.role === "owner" ? "owner" : "editor";
    const usernameError = usernameProblem(username);
    const passwordError = passwordProblem(password);
    if (usernameError || passwordError) {
      return Response.json({ error: usernameError ?? passwordError }, { status: 400 });
    }
    const [duplicate] = await getDb()
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(or(eq(adminUsers.username, username), eq(adminUsers.githubLogin, username)))
      .limit(1);
    if (duplicate) {
      return Response.json({ error: "该用户名已经被使用。" }, { status: 409 });
    }

    const credentials = await createPasswordCredentials(password);
    const [created] = await getDb()
      .insert(adminUsers)
      .values({
        // Retained for safe migration from early GitHub-only versions.
        githubLogin: username,
        username,
        ...credentials,
        displayName: displayName || null,
        role,
        status: "active",
      })
      .returning();
    await getDb().insert(auditLogs).values({
      adminUserId: identity.id,
      action: "invite",
      entityType: "admin_user",
      entityId: String(created.id),
      afterJson: JSON.stringify(publicUser(created)),
    });
    return Response.json({ user: publicUser(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const identity = await requireApiAdmin(request);
    assertOwner(identity);
    assertCsrf(request, identity);
    const body = (await request.json()) as Record<string, unknown>;
    const id = Math.trunc(Number(body.id));
    const role = body.role === "owner" ? "owner" : "editor";
    const status = body.status === "disabled" ? "disabled" : "active";
    const password = body.password === undefined ? null : String(body.password);
    const passwordError = password === null ? null : passwordProblem(password);
    if (!Number.isFinite(id) || id < 1) {
      return Response.json({ error: "管理员不存在。" }, { status: 404 });
    }
    if (passwordError) {
      return Response.json({ error: passwordError }, { status: 400 });
    }

    const [existing] = await getDb()
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    if (!existing) {
      return Response.json({ error: "管理员不存在。" }, { status: 404 });
    }

    const removesOwner =
      existing.role === "owner" && (role !== "owner" || status !== "active");
    if (removesOwner) {
      const [countRow] = await getDb()
        .select({ count: sql<number>`count(*)` })
        .from(adminUsers)
        .where(
          and(
            eq(adminUsers.role, "owner"),
            eq(adminUsers.status, "active"),
            ne(adminUsers.id, id),
          ),
        );
      if (!Number(countRow?.count)) {
        return Response.json(
          { error: "系统必须至少保留一位有效负责人。" },
          { status: 400 },
        );
      }
    }

    const credentials = password ? await createPasswordCredentials(password) : {};
    const [updated] = await getDb()
      .update(adminUsers)
      .set({
        role,
        status,
        ...credentials,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(adminUsers.id, id))
      .returning();
    if (password || status === "disabled") {
      await deleteUserSessions(id);
    }
    await getDb().insert(auditLogs).values({
      adminUserId: identity.id,
      action: password ? "password_reset" : "permission_update",
      entityType: "admin_user",
      entityId: String(id),
      beforeJson: JSON.stringify(publicUser(existing)),
      afterJson: JSON.stringify(publicUser(updated)),
    });
    return Response.json({ user: publicUser(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
