import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdminIdentity()) redirect("/admin");
  const query = await searchParams;

  return (
    <main className="admin-login-page">
      <Link className="admin-login-brand" href="/">
        <span>MA</span>
        <div>
          <strong>马乐课题组</strong>
          <small>网站内容管理中心</small>
        </div>
      </Link>
      <section className="admin-login-card">
        <p className="admin-kicker">CONTENT MANAGEMENT</p>
        <h1>管理员登录</h1>
        <p>使用课题组分配的账号和密码，管理项目、成员、论文和科研动态。</p>
        {query.error && <div className="admin-alert error">{query.error}</div>}
        <form className="admin-login-form" action="/api/auth/login" method="post">
          <label>
            <span>用户名</span>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              required
              placeholder="请输入管理员用户名"
            />
          </label>
          <label>
            <span>密码</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="请输入密码"
            />
          </label>
          <button type="submit" className="admin-login-submit">
            登录管理后台
          </button>
        </form>
        <div className="admin-login-help">
          <strong>首次使用或忘记密码？</strong>
          <p>请联系课题组网站负责人创建账号或重设密码。连续输错多次会暂时锁定登录。</p>
        </div>
        <Link className="admin-back-link" href="/">
          ← 返回课题组主页
        </Link>
      </section>
    </main>
  );
}
