Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path "wrangler.jsonc")) {
  Write-Host "未找到 wrangler.jsonc。请先复制 wrangler.example.jsonc 为 wrangler.jsonc，并填入 D1 数据库 ID。" -ForegroundColor Yellow
  exit 1
}

Write-Host "正在安装项目依赖..."
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "正在构建网站..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "正在发布到 Cloudflare..."
npx wrangler deploy
exit $LASTEXITCODE
