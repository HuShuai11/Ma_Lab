import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("ships the MA Lab public site instead of the starter preview", async () => {
  const [page, layout] = await Promise.all([
    source("app/page.tsx"),
    source("app/layout.tsx"),
  ]);

  assert.match(page, /马乐课题组/);
  assert.match(page, /loadPublicSiteData/);
  assert.match(page, /href="\/admin"/);
  assert.match(layout, /东北电力大学自动化工程学院/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});

test("keeps shared content and account state in the cloud-backed schema", async () => {
  const schema = await source("db/schema.ts");
  const contentApi = await source("app/api/admin/content/route.ts");

  assert.match(schema, /passwordHash/);
  assert.match(schema, /passwordSalt/);
  assert.match(schema, /adminLoginAttempts/);
  assert.match(schema, /revision: integer\("revision"\)/);
  assert.match(contentApi, /expectedRevision/);
  assert.match(contentApi, /刚刚被其他管理员更新/);
});

test("uses password accounts with protected sessions rather than GitHub OAuth", async () => {
  const [auth, login, users] = await Promise.all([
    source("lib/admin-auth.ts"),
    source("app/api/auth/login/route.ts"),
    source("app/api/admin/users/route.ts"),
  ]);

  assert.match(auth, /PBKDF2/);
  assert.match(auth, /INITIAL_ADMIN_PASSWORD/);
  assert.match(auth, /deleteUserSessions/);
  assert.match(login, /registerFailedLogin/);
  assert.match(users, /createPasswordCredentials/);
  assert.doesNotMatch(login, /github\.com/);
});
