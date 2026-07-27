"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ContentRecord,
  ContentType,
  ContentVisibility,
} from "@/lib/site-content";

type Identity = {
  id: number;
  username: string;
  displayName: string | null;
  role: "owner" | "editor";
  csrfToken: string;
};

type AdminUser = {
  id: number;
  username: string;
  displayName: string | null;
  role: "owner" | "editor";
  status: "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
};

type AuditItem = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  username: string;
};

type AdminSection = ContentType | "users" | "audit";

const MODULES: Array<{
  type: AdminSection;
  index: string;
  label: string;
  description: string;
}> = [
  { type: "projects", index: "01", label: "项目成果", description: "项目封面、简介与详情" },
  { type: "members", index: "02", label: "团队成员", description: "成员照片与研究方向" },
  { type: "publications", index: "03", label: "论文成果", description: "论文、期刊与链接" },
  { type: "activities", index: "04", label: "科研动态", description: "活动、荣誉与新闻" },
  { type: "research", index: "05", label: "研究方向", description: "方向介绍与关键词" },
  { type: "settings", index: "06", label: "网站设置", description: "首页文案与联系方式" },
  { type: "users", index: "07", label: "管理员", description: "负责人和编辑权限" },
  { type: "audit", index: "08", label: "修改记录", description: "后台操作留痕" },
];

const FIELDS: Record<
  ContentType,
  Array<{
    key: string;
    label: string;
    type?: "text" | "textarea" | "tags" | "image" | "url";
    placeholder?: string;
  }>
> = {
  settings: [
    { key: "heroTitle", label: "首页主标题" },
    { key: "heroAccent", label: "强调标题" },
    { key: "heroLead", label: "首页简介", type: "textarea" },
    { key: "aboutTitle", label: "课题组介绍标题" },
    { key: "aboutLead", label: "介绍摘要", type: "textarea" },
    { key: "aboutText", label: "详细介绍", type: "textarea" },
    { key: "contactText", label: "招生与联系说明", type: "textarea" },
    { key: "contactEmail", label: "联系邮箱" },
  ],
  research: [
    { key: "english", label: "英文名称" },
    { key: "text", label: "方向介绍", type: "textarea" },
    { key: "tags", label: "关键词", type: "tags", placeholder: "用中文逗号分隔" },
  ],
  projects: [
    { key: "english", label: "英文名称" },
    { key: "summary", label: "项目摘要", type: "textarea" },
    { key: "status", label: "项目状态", placeholder: "例如：系统原型 · 持续迭代" },
    { key: "tags", label: "项目标签", type: "tags", placeholder: "用中文逗号分隔" },
    { key: "heroImage", label: "项目封面", type: "image" },
    { key: "detail", label: "项目详情", type: "textarea" },
    { key: "href", label: "自定义详情地址", type: "url", placeholder: "留空则自动生成" },
  ],
  members: [
    { key: "role", label: "身份", placeholder: "硕士研究生 / 博士研究生 / 已毕业" },
    { key: "research", label: "研究方向" },
    { key: "bio", label: "个人介绍", type: "textarea" },
    { key: "image", label: "成员照片", type: "image" },
    { key: "link", label: "个人主页", type: "url" },
  ],
  publications: [
    { key: "year", label: "发表年份" },
    { key: "journal", label: "期刊或会议" },
    { key: "authors", label: "作者列表", type: "textarea" },
    { key: "link", label: "DOI 或论文链接", type: "url" },
  ],
  activities: [
    { key: "year", label: "年份或日期" },
    { key: "category", label: "类别", placeholder: "项目 / 荣誉 / 科研 / 活动" },
    { key: "text", label: "动态内容", type: "textarea" },
    { key: "image", label: "活动图片", type: "image" },
  ],
};

function makeDraft(type: ContentType, items: ContentRecord[]) {
  const maxOrder = Math.max(
    0,
    ...items.filter((item) => item.type === type).map((item) => item.sortOrder),
  );
  return {
    id: 0,
    type,
    slug: "",
    title: type === "settings" ? "课题组首页设置" : "",
    payload: {} as Record<string, unknown>,
    sortOrder: maxOrder + 1,
    revision: 1,
    visibility: "visible" as ContentVisibility,
    createdAt: "",
    updatedAt: "",
  };
}

function payloadValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return Array.isArray(value) ? value.join("，") : String(value ?? "");
}

function actionLabel(action: string) {
  return (
    {
      create: "新增",
      update: "修改",
      delete: "删除",
      upload: "上传文件",
      invite: "创建管理员",
      permission_update: "修改权限",
      password_reset: "重设密码",
      login: "登录后台",
    }[action] ?? action
  );
}

export default function AdminDashboard({
  initialItems,
  identity,
}: {
  initialItems: ContentRecord[];
  identity: Identity;
}) {
  const [items, setItems] = useState(initialItems);
  const [section, setSection] = useState<AdminSection>("projects");
  const [editing, setEditing] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");

  const currentModule = MODULES.find((item) => item.type === section)!;
  const sectionItems = useMemo(
    () =>
      items
        .filter((item) => item.type === section)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items, section],
  );

  const api = useCallback(async function api(
    url: string,
    options: RequestInit = {},
  ): Promise<Record<string, unknown>> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "content-type": "application/json" }),
        "x-csrf-token": identity.csrfToken,
        ...(options.headers ?? {}),
      },
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(data.error ?? "操作失败"));
    return data;
  }, [identity.csrfToken]);

  async function refreshItems() {
    const data = await api("/api/admin/content");
    setItems(data.items as ContentRecord[]);
  }

  useEffect(() => {
    if (section === "users" && identity.role === "owner") {
      api("/api/admin/users")
        .then((data) => setUsers(data.users as AdminUser[]))
        .catch((error: Error) => setMessage(error.message));
    }
    if (section === "audit") {
      api("/api/admin/audit")
        .then((data) => setAudit(data.logs as AuditItem[]))
        .catch((error: Error) => setMessage(error.message));
    }
  }, [api, identity.role, section]);

  function selectSection(nextSection: AdminSection) {
    if (nextSection === "users" && identity.role !== "owner") return;
    setSection(nextSection);
    setEditing(null);
    setMessage("");
  }

  function beginCreate() {
    if (section === "users" || section === "audit") return;
    setEditing(makeDraft(section, items));
  }

  function updateDraft(key: string, value: unknown) {
    setEditing((current) =>
      current
        ? key in current
          ? { ...current, [key]: value }
          : { ...current, payload: { ...current.payload, [key]: value } }
        : current,
    );
  }

  async function saveItem() {
    if (!editing) return;
    setBusy(true);
    setMessage("");
    try {
      const normalizedPayload = { ...editing.payload };
      for (const field of FIELDS[editing.type]) {
        if (field.type === "tags") {
          normalizedPayload[field.key] = payloadValue(
            editing.payload,
            field.key,
          )
            .split(/[，,]/)
            .map((value) => value.trim())
            .filter(Boolean);
        }
      }
      await api("/api/admin/content", {
        method: editing.id ? "PATCH" : "POST",
        body: JSON.stringify({ ...editing, payload: normalizedPayload }),
      });
      await refreshItems();
      setEditing(null);
      setMessage("内容已保存，公开网站会立即显示最新结果。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function setVisibility(item: ContentRecord, visibility: ContentVisibility) {
    if (
      visibility === "deleted" &&
      !window.confirm(
        `确定删除“${item.title}”吗？它会立即从公开网站中移除，之后仍可在本页恢复。`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/content", {
        method: "PATCH",
        body: JSON.stringify({ ...item, visibility }),
      });
      await refreshItems();
      if (visibility === "deleted") {
        setEditing((current) => (current?.id === item.id ? null : current));
      }
      setMessage(
        visibility === "visible"
          ? "内容已恢复并公开显示。"
          : visibility === "hidden"
            ? "内容已隐藏。"
            : "内容已删除，公开网站将不再显示；需要时可在列表中恢复。",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(
    event: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("altText", editing?.title ?? "");
      const data = await api("/api/admin/media", {
        method: "POST",
        body: formData,
      });
      const asset = data.asset as { url: string };
      updateDraft(key, asset.url);
      setMessage("图片上传完成，保存内容后正式生效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function inviteUser() {
    if (!inviteUsername.trim() || !invitePassword) {
      setMessage("请填写用户名和初始密码。");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: inviteUsername,
          displayName: inviteDisplayName,
          password: invitePassword,
          role: "editor",
        }),
      });
      const data = await api("/api/admin/users");
      setUsers(data.users as AdminUser[]);
      setInviteUsername("");
      setInviteDisplayName("");
      setInvitePassword("");
      setMessage("管理员账号已创建，可以使用账号密码登录。 ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邀请失败");
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(
    user: AdminUser,
    patch: Partial<AdminUser> & { password?: string },
  ) {
    setBusy(true);
    try {
      await api("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ ...user, ...patch }),
      });
      if (user.id === identity.id && patch.password) {
        window.location.assign("/admin/login?error=密码已更新，请使用新密码重新登录。");
        return;
      }
      const data = await api("/api/admin/users");
      setUsers(data.users as AdminUser[]);
      setMessage("管理员权限已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    } finally {
      setBusy(false);
    }
  }

  function resetUserPassword(user: AdminUser) {
    const password = window.prompt(`请为“${user.displayName || user.username}”设置新密码（至少10位）：`);
    if (password === null) return;
    if (password.length < 10) {
      setMessage("新密码至少需要10位。");
      return;
    }
    void updateUser(user, { password });
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" target="_blank">
          <span>MA</span>
          <div>
            <strong>课题组网站</strong>
            <small>内容管理中心</small>
          </div>
        </a>
        <nav>
          {MODULES.map((module) => {
            const restricted = module.type === "users" && identity.role !== "owner";
            return (
              <button
                key={module.type}
                className={section === module.type ? "active" : ""}
                onClick={() => selectSection(module.type)}
                disabled={restricted}
              >
                <span>{module.index}</span>
                <div>
                  <strong>{module.label}</strong>
                  <small>{restricted ? "仅负责人可见" : module.description}</small>
                </div>
              </button>
            );
          })}
        </nav>
        <div className="admin-account">
          <span>{identity.username.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{identity.displayName || identity.username}</strong>
            <small>{identity.role === "owner" ? "负责人" : "编辑"}</small>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit">退出</button>
          </form>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p>MA LAB · ADMIN</p>
            <h1>{currentModule.label}</h1>
            <span>{currentModule.description}</span>
          </div>
          {!["users", "audit"].includes(section) && (
            <button className="admin-primary" onClick={beginCreate}>
              ＋ 新增内容
            </button>
          )}
        </header>

        <div className="admin-stats">
          <article>
            <span>公开内容</span>
            <strong>{items.filter((item) => item.visibility === "visible").length}</strong>
          </article>
          <article>
            <span>当前模块</span>
            <strong>{sectionItems.length}</strong>
          </article>
          <article>
            <span>登录身份</span>
            <strong>{identity.role === "owner" ? "负责人" : "编辑"}</strong>
          </article>
        </div>

        {message && <div className="admin-message">{message}</div>}

        {section !== "users" && section !== "audit" && (
          <div className="admin-content-grid">
            <section className="admin-list-panel">
              <div className="admin-panel-title">
                <strong>内容列表</strong>
                <span>保存后立即更新公开网站</span>
              </div>
              {sectionItems.length ? (
                <div className="admin-item-list">
                  {sectionItems.map((item) => (
                    <article
                      key={item.id}
                      className={editing?.id === item.id ? "selected" : ""}
                    >
                      <div className="admin-item-order">
                        {String(item.sortOrder).padStart(2, "0")}
                      </div>
                      <div className="admin-item-copy">
                        <strong>{item.title}</strong>
                        <span>{item.slug}</span>
                      </div>
                      <span className={`visibility ${item.visibility}`}>
                        {item.visibility === "visible"
                          ? "公开"
                          : item.visibility === "hidden"
                            ? "隐藏"
                            : "已删除"}
                      </span>
                      <div className="admin-item-actions">
                        <button onClick={() => setEditing(item)}>编辑</button>
                        {item.visibility === "visible" ? (
                          <button onClick={() => setVisibility(item, "hidden")}>隐藏</button>
                        ) : (
                          <button onClick={() => setVisibility(item, "visible")}>恢复</button>
                        )}
                        {item.visibility !== "deleted" && (
                          <button
                            className="admin-delete-link"
                            onClick={() => void setVisibility(item, "deleted")}
                          >
                            删除（可恢复）
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">这个模块还没有内容。</div>
              )}
            </section>

            <section className="admin-editor-panel">
              {editing ? (
                <>
                  <div className="admin-panel-title">
                    <strong>{editing.id ? "编辑内容" : "新增内容"}</strong>
                    <button onClick={() => setEditing(null)}>关闭</button>
                  </div>
                  <div className="admin-form">
                    <label>
                      <span>标题</span>
                      <input
                        value={editing.title}
                        onChange={(event) => updateDraft("title", event.target.value)}
                      />
                    </label>
                    <div className="admin-form-row">
                      <label>
                        <span>页面标识</span>
                        <input
                          value={editing.slug}
                          placeholder="例如 smart-energy"
                          onChange={(event) => updateDraft("slug", event.target.value)}
                        />
                      </label>
                      <label>
                        <span>排序</span>
                        <input
                          type="number"
                          min="0"
                          value={editing.sortOrder}
                          onChange={(event) =>
                            updateDraft("sortOrder", Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    {FIELDS[editing.type].map((field) => (
                      <label key={field.key}>
                        <span>{field.label}</span>
                        {field.type === "textarea" ? (
                          <textarea
                            rows={4}
                            value={payloadValue(editing.payload, field.key)}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              updateDraft(field.key, event.target.value)
                            }
                          />
                        ) : (
                          <input
                            type={field.type === "url" ? "url" : "text"}
                            value={payloadValue(editing.payload, field.key)}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              updateDraft(field.key, event.target.value)
                            }
                          />
                        )}
                        {field.type === "image" && (
                          <span className="upload-row">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(event) => uploadImage(event, field.key)}
                            />
                            {payloadValue(editing.payload, field.key) && (
                              <img
                                src={payloadValue(editing.payload, field.key)}
                                alt="上传预览"
                              />
                            )}
                          </span>
                        )}
                      </label>
                    ))}
                    <label>
                      <span>展示状态</span>
                      <select
                        value={editing.visibility}
                        onChange={(event) =>
                          updateDraft(
                            "visibility",
                            event.target.value as ContentVisibility,
                          )
                        }
                      >
                        <option value="visible">公开显示</option>
                        <option value="hidden">暂时隐藏</option>
                      </select>
                    </label>
                    <div className="admin-editor-actions">
                      <button
                        className="admin-save"
                        disabled={busy}
                        onClick={saveItem}
                      >
                        {busy ? "正在保存…" : "保存并更新网站"}
                      </button>
                      {editing.id > 0 && editing.visibility !== "deleted" && (
                        <button
                          className="admin-delete"
                          type="button"
                          disabled={busy}
                          onClick={() => void setVisibility(editing, "deleted")}
                        >
                          删除此内容
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-editor-placeholder">
                  <span>↖</span>
                  <h2>选择一条内容进行编辑</h2>
                  <p>也可以点击右上角“新增内容”创建新的展示记录。</p>
                </div>
              )}
            </section>
          </div>
        )}

        {section === "users" && identity.role === "owner" && (
          <section className="admin-users-panel">
            <div className="admin-invite">
              <div>
                <strong>邀请新编辑</strong>
                <span>创建可登录后台的账号</span>
              </div>
              <input
                value={inviteUsername}
                placeholder="用户名，例如 ma-editor"
                onChange={(event) => setInviteUsername(event.target.value)}
              />
              <input
                value={inviteDisplayName}
                placeholder="显示名称，例如 张同学"
                onChange={(event) => setInviteDisplayName(event.target.value)}
              />
              <input
                type="password"
                value={invitePassword}
                placeholder="初始密码（至少10位）"
                onChange={(event) => setInvitePassword(event.target.value)}
              />
              <button className="admin-primary" disabled={busy} onClick={inviteUser}>
                加入管理员
              </button>
            </div>
            <div className="admin-user-list">
              {users.map((user) => (
                <article key={user.id}>
                  <span className="user-avatar">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{user.displayName || user.username}</strong>
                    <small>@{user.username}</small>
                  </div>
                  <select
                    value={user.role}
                    onChange={(event) =>
                      updateUser(user, {
                        role: event.target.value as "owner" | "editor",
                      })
                    }
                  >
                    <option value="owner">负责人</option>
                    <option value="editor">编辑</option>
                  </select>
                  <select
                    value={user.status}
                    onChange={(event) =>
                      updateUser(user, {
                        status: event.target.value as "active" | "disabled",
                      })
                    }
                  >
                    <option value="active">允许登录</option>
                    <option value="disabled">停用</option>
                  </select>
                  <button
                    className="admin-user-password"
                    type="button"
                    onClick={() => resetUserPassword(user)}
                  >
                    重设密码
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === "audit" && (
          <section className="admin-audit-panel">
            <div className="admin-panel-title">
              <strong>最近 100 条修改记录</strong>
              <span>记录修改人、操作内容和时间</span>
            </div>
            <div className="admin-audit-list">
              {audit.map((log) => (
                <article key={log.id}>
                  <span>{actionLabel(log.action)}</span>
                  <div>
                    <strong>{log.entityType}</strong>
                    <small>记录 #{log.entityId}</small>
                  </div>
                  <div>
                    <strong>@{log.username}</strong>
                    <small>{new Date(log.createdAt).toLocaleString("zh-CN")}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
