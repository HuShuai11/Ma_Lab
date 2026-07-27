param(
  [Parameter(Position = 0)]
  [string]$DatabaseName = "ma-lab-content",
  [string]$OutputDirectory = "backups"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destination = Join-Path $OutputDirectory "${DatabaseName}-${timestamp}.sql"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

Write-Host "正在导出 D1 数据库备份..."
npx wrangler d1 export $DatabaseName --remote --output $destination
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "备份已完成：$destination" -ForegroundColor Green
