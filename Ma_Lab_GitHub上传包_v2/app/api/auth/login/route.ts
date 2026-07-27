import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminUsers, auditLogs } from "@/db/schema";
import {
  clearFailedLogins,
  createAdminSession,
  ensureInitialAdmin,
  getLoginBlockMessage,
  normalizeUsername,
  registerFailedLogin,
  verifyPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function redirectToLogin(request: Request, message: string) {
  return Response.redirect(
    new URL(`/admin/login?error=${encodeURIComponent(message)}`, request.url),
    303,
  );
}

function initializationErrorMessage(error: unknown) {
  const details = initializationErrorDetails(error);
  const message = details.toLowerCase();
  if (message.includes("binding `db` is unavailable")) {
    return "后台数据服务未连接（D1-01）。";
  }
  if (message.includes("no such table") || message.includes("no such column")) {
    return "后台数据结构尚未准备好（D1-02）。";
  }
  if (message.includes("d1") || message.includes("database")) {
    return "后台数据服务暂时不可用（D1-03）。";
  }
  return "后台初始化暂时失败（SYS-01）。";
}

function initializationErrorDetails(error: unknown) {
  let details: string;
  if (error instanceof Error) {
    details = `${error.name}: ${error.message}`;
  } else if (error && typeof error === "object") {
    const value = error as {
      name?: unknown;
      message?: unknown;
      cause?: unknown;
      constructor?: { name?: unknown };
    };
    details = [
      value.name ?? value.constructor?.name ?? "Object",
      value.message ?? "",
      value.cause ?? "",
    ]
      .map(String)
      .join(" ");
  } else {
    details = String(error);
  }
  return details
    .replaceAll("maleLab2026", "[已隐藏]")
    .replace(/INITIAL_ADMIN_PASSWORD\s*[:=]\s*[^,\s]*/gi, "INITIAL_ADMIN_PASSWORD=[已隐藏]")
    .slice(0, 160);
}

export async function POST(request: Request) {
  try {
    await ensureInitialAdmin();
    const formData = await request.formData();
    const username = normalizeUsername(formData.get("username"));
    const password = String(formData.get("password") ?? "");
    const blockMessage = await getLoginBlockMessage(request, username);
    if (blockMessage) return redirectToLogin(request, blockMessage);
    const [user] = await getDb()
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (
      !user ||
      user.status !== "active" ||
      !(await verifyPassword(password, user.passwordSalt, user.passwordHash))
    ) {
      await registerFailedLogin(request, username);
      return redirectToLogin(request, "用户名或密码不正确。");
    }

    await clearFailedLogins(request, username);
    await getDb()
      .update(adminUsers)
      .set({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(adminUsers.id, user.id));
    await getDb().insert(auditLogs).values({
      adminUserId: user.id,
      action: "login",
      entityType: "admin_user",
      entityId: String(user.id),
    });
    const session = await createAdminSession(user.id, request);
    return new Response(null, {
      status: 303,
      headers: {
        location: new URL("/admin", request.url).toString(),
        "set-cookie": session.cookie,
      },
    });
  } catch (error) {
    console.error("Administrator login initialization failed", error);
    return redirectToLogin(request, initializationErrorMessage(error));
  }
}
