# 马乐课题组网站｜Cloudflare 免费长期部署

本项目只需要部署一次。公开展示页使用 `/`，管理员内容中心使用 `/admin`；两者读取同一份内容和图片。

## 0. 账号归属

请使用老师或课题组长期邮箱创建以下账号，并至少保留两位负责人：

- GitHub：保存代码和部署记录。建议建立私有仓库，并把老师与长期维护同学设为管理员。
- Cloudflare：运行网站、保存内容和图片。不要使用某一位即将毕业同学的个人邮箱作为唯一负责人。

开启两步验证。账号密码、Cloudflare API 令牌和网站管理员初始密码均不能提交到 GitHub。

## 1. 创建 Cloudflare 资源

登录 Cloudflare 后，在同一个账号中创建：

1. 一个 D1 数据库，名称建议为 `ma-lab-content`。
2. 一个 R2 存储桶，名称建议为 `ma-lab-media`。
3. 一个 Worker，名称建议为 `ma-lab-showcase`。

网站文字、管理员、操作记录放在 D1；上传的项目封面、成员照片和活动图片放在 R2。

## 2. 填写部署配置

1. 将项目根目录的 `wrangler.example.jsonc` 复制为 `wrangler.jsonc`。
2. 在 Cloudflare 的 D1 数据库详情页复制数据库 ID，替换 `database_id` 的提示文字。
3. 若修改了数据库或存储桶名称，同步修改 `database_name` 和 `bucket_name`。
4. 将填写后的 `wrangler.jsonc` 提交到 GitHub。数据库 ID 不是密码，可以保存到代码仓库。

## 3. 设置首次负责人账号

在 Cloudflare Worker 的“变量和机密”中添加三项机密变量：

```text
INITIAL_ADMIN_USERNAME=ma-admin
INITIAL_ADMIN_PASSWORD=请设置仅负责人知晓的密码
INITIAL_ADMIN_DISPLAY_NAME=课题组负责人
```

首次登录成功后，系统会创建负责人账号。以后新增学生管理员请在网站 `/admin` 的“管理员”模块中完成，不需要再修改这些变量。

## 4. Windows 首次发布

在项目文件夹中打开 PowerShell，并依次执行：

```powershell
npx wrangler login
npm run cloudflare:deploy
```

首次发布后，Cloudflare 会给出一个免费的 `*.workers.dev` 地址。这个地址可同时访问展示页和管理中心：

```text
https://你的Worker名称.你的Cloudflare子域.workers.dev/
https://你的Worker名称.你的Cloudflare子域.workers.dev/admin
```

第一次打开网站时会自动建立数据表并写入默认展示内容。

## 5. 连接 GitHub 自动发布

在 Cloudflare 的 Worker 设置中打开“Builds”，连接课题组 GitHub 仓库并选择 `main` 分支。构建命令设置为：

```text
npm ci && npm run build
```

发布命令设置为：

```text
npx wrangler deploy
```

以后程序代码合并到 `main` 后会自动发布。日常改项目、成员、论文、活动时只用管理中心保存，无需重新发布。

## 6. 内容迁移与验收

切换新网址前，请检查：

1. 公开首页、三个项目详情、成员、论文和活动是否正常打开。
2. 负责人能登录 `/admin`，能新增、修改、删除并恢复一条测试内容。
3. 上传一张测试图片，并确认公开页面可显示。
4. 用另一台电脑登录后台，确认能看到最新内容。

原在线站点请保留到新站稳定运行一周后再停止使用。管理员账号重新创建，不迁移旧的登录状态。

## 7. 备份与交接

每月一次，在已登录 Cloudflare 的电脑中运行：

```powershell
npm run cloudflare:backup
```

备份文件会保存在 `backups` 文件夹；请再复制到老师电脑或课题组硬盘。上传图片同时在 R2 控制台定期下载一份。

负责人交接时必须完成：

1. 将 GitHub 仓库和 Cloudflare 账号管理员权限交给下一位负责人。
2. 在后台停用离组学生账号。
3. 提供最新数据库备份和图片备份。
4. 更新本说明中的负责人信息和密码保管方式。
