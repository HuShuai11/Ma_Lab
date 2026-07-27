import { and, eq, gt, isNotNull, or } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { ensureDatabaseSchema, getDb } from "@/db";
import { adminLoginAttempts, adminSessions, adminUsers } from "@/db/schema";

const SESSION_COOKIE = "ma_lab_admin_session";
const SESSION_DAYS = 7;
// The deployed Workers runtime currently permits up to 100,000 PBKDF2 rounds.
// Keeping this at the supported ceiling preserves strong password derivation
// without preventing the first administrator account from being created.
const PASSWORD_ITERATIONS = 100_000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

export type AdminRole = "owner" | "editor";

export type AdminIdentity = {
  id: number;
  username: string;
  displayName: string | null;
  role: AdminRole;
  csrfToken: string;
  expiresAt: string;
};

type RuntimeConfig = {
  INITIAL_ADMIN_USERNAME?: string;
  INITIAL_ADMIN_PASSWORD?: string;
  INITIAL_ADMIN_DISPLAY_NAME?: string;
};

export function getRuntimeConfig(): RuntimeConfig {
  return env as unknown as RuntimeConfig;
}

export function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function usernameProblem(value: string) {
  return /^[a-z0-9][a-z0-9_-]{2,31}$/.test(value)
    ? null
    : "用户名需为3至32位小写字母、数字、下划线或短横线。";
}

export function passwordProblem(value: string) {
  if (value.length < 10) return "密码至少需要10位。";
  if (value.length > 256) return "密码不能超过256位。";
  return null;
}

function parseCookies(cookieHeader: string | null) {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) cookies.set(key, decodeURIComponent(value));
  }
  return cookies;
}

function randomToken(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buffer))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fixedTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function derivePasswordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function createPasswordCredentials(password: string) {
  const salt = randomToken(24);
  return { passwordSalt: salt, passwordHash: await derivePasswordHash(password, salt) };
}

export async function verifyPassword(
  password: string,
  passwordSalt: string | null,
  passwordHash: string | null,
) {
  if (!passwordSalt || !passwordHash) return false;
  return fixedTimeEqual(
    await derivePasswordHash(password, passwordSalt),
    passwordHash,
  );
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function ensureInitialAdmin() {
  await ensureDatabaseSchema();
  const db = getDb();
  const passwordAdmin = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(isNotNull(adminUsers.passwordHash))
    .limit(1);
  if (passwordAdmin.length) return false;

  const config = getRuntimeConfig();
  const username = normalizeUsername(config.INITIAL_ADMIN_USERNAME);
  const password = String(config.INITIAL_ADMIN_PASSWORD ?? "");
  if (!username || usernameProblem(username) || passwordProblem(password)) {
    return false;
  }

  const credentials = await createPasswordCredentials(password);
  const displayName = String(config.INITIAL_ADMIN_DISPLAY_NAME ?? "课题组负责人")
    .trim()
    .slice(0, 80);
  const [legacyUser] = await db
    .select()
    .from(adminUsers)
    .where(or(eq(adminUsers.username, username), eq(adminUsers.githubLogin, username)))
    .limit(1);
  if (legacyUser) {
    await db
      .update(adminUsers)
      .set({
        username,
        ...credentials,
        displayName,
        role: "owner",
        status: "active",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(adminUsers.id, legacyUser.id));
  } else {
    await db.insert(adminUsers).values({
      // Kept for compatibility with early database versions. New logins use username.
      githubLogin: username,
      username,
      ...credentials,
      displayName,
      role: "owner",
      status: "active",
    });
  }
  return true;
}

function loginFingerprint(request: Request, username: string) {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  return sha256(`${username}|${ip}`);
}

export async function getLoginBlockMessage(request: Request, username: string) {
  const keyHash = await loginFingerprint(request, username);
  const [attempt] = await getDb()
    .select()
    .from(adminLoginAttempts)
    .where(eq(adminLoginAttempts.keyHash, keyHash))
    .limit(1);
  if (attempt?.blockedUntil && attempt.blockedUntil > new Date().toISOString()) {
    return "尝试次数过多，请15分钟后再试。";
  }
  return null;
}

export async function registerFailedLogin(request: Request, username: string) {
  const keyHash = await loginFingerprint(request, username);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(adminLoginAttempts)
    .where(eq(adminLoginAttempts.keyHash, keyHash))
    .limit(1);
  const now = new Date();
  const windowStartedAt = existing ? new Date(existing.windowStartedAt) : null;
  const startsNewWindow =
    !windowStartedAt || Number.isNaN(windowStartedAt.valueOf()) || now.valueOf() - windowStartedAt.valueOf() > LOGIN_WINDOW_MS;
  const attemptCount = startsNewWindow ? 1 : existing!.attemptCount + 1;
  const blockedUntil =
    attemptCount >= LOGIN_MAX_ATTEMPTS
      ? new Date(now.valueOf() + LOGIN_WINDOW_MS).toISOString()
      : null;
  const values = {
    attemptCount,
    windowStartedAt: startsNewWindow ? now.toISOString() : existing!.windowStartedAt,
    blockedUntil,
    updatedAt: now.toISOString(),
  };
  if (existing) {
    await db
      .update(adminLoginAttempts)
      .set(values)
      .where(eq(adminLoginAttempts.keyHash, keyHash));
  } else {
    await db.insert(adminLoginAttempts).values({ keyHash, ...values });
  }
}

export async function clearFailedLogins(request: Request, username: string) {
  await getDb()
    .delete(adminLoginAttempts)
    .where(eq(adminLoginAttempts.keyHash, await loginFingerprint(request, username)));
}

async function identityFromCookie(cookieHeader: string | null) {
  await ensureDatabaseSchema();
  const rawToken = parseCookies(cookieHeader).get(SESSION_COOKIE);
  if (!rawToken) return null;

  const tokenHash = await sha256(rawToken);
  const now = new Date().toISOString();
  const rows = await getDb()
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      csrfToken: adminSessions.csrfToken,
      expiresAt: adminSessions.expiresAt,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        gt(adminSessions.expiresAt, now),
        eq(adminUsers.status, "active"),
      ),
    )
    .limit(1);

  const identity = rows[0];
  return identity?.username ? (identity as AdminIdentity) : null;
}

export async function getAdminIdentity(request?: Request) {
  try {
    const cookieHeader = request
      ? request.headers.get("cookie")
      : (await headers()).get("cookie");
    return await identityFromCookie(cookieHeader);
  } catch {
    return null;
  }
}

export async function requireApiAdmin(request: Request) {
  const identity = await getAdminIdentity(request);
  if (!identity) {
    throw new Response(JSON.stringify({ error: "请先登录管理员账号。" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return identity;
}

export function assertOwner(identity: AdminIdentity) {
  if (identity.role !== "owner") {
    throw new Response(JSON.stringify({ error: "只有负责人可以执行此操作。" }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

export function assertCsrf(request: Request, identity: AdminIdentity) {
  const supplied = request.headers.get("x-csrf-token");
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (!supplied || supplied !== identity.csrfToken || (origin && origin !== requestOrigin)) {
    throw new Response(JSON.stringify({ error: "安全校验失败，请刷新页面后重试。" }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}

function secureAttribute(request: Request) {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

export async function createAdminSession(adminUserId: number, request: Request) {
  const rawToken = randomToken();
  const csrfToken = randomToken(24);
  const tokenHash = await sha256(rawToken);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  await getDb().insert(adminSessions).values({
    tokenHash,
    adminUserId,
    csrfToken,
    expiresAt,
  });

  return {
    csrfToken,
    expiresAt,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly${secureAttribute(request)}; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  };
}

export async function deleteAdminSession(request: Request) {
  const rawToken = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE);
  if (rawToken) {
    await getDb()
      .delete(adminSessions)
      .where(eq(adminSessions.tokenHash, await sha256(rawToken)));
  }
}

export async function deleteUserSessions(adminUserId: number) {
  await getDb()
    .delete(adminSessions)
    .where(eq(adminSessions.adminUserId, adminUserId));
}

export function clearSessionCookie(request: Request) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly${secureAttribute(request)}; SameSite=Lax; Max-Age=0`;
}

export function jsonError(error: unknown) {
  if (error instanceof Response) return error;
  const detail = error instanceof Error
    ? `${error.name}: ${error.message}; cause=${String((error as Error & { cause?: unknown }).cause ?? "")}`
    : error && typeof error === "object"
      ? Object.getOwnPropertyNames(error)
          .map((key) => `${key}=${String((error as Record<string, unknown>)[key])}`)
          .join("; ")
      : String(error);
  console.error(`Administrator API request failed: ${detail}`);
  return Response.json({ error: "系统暂时无法完成此操作，请稍后再试。" }, { status: 500 });
}
