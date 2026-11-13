param(
    [string]$ContainerName = "ecommerce-postgres",
    [string]$DbName = "ecommerce_db",
    [string]$DbUser = "ecommerce",
    [string]$BackupDir = "$PSScriptRoot\..\..\backups"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = Join-Path $BackupDir "ecommerce_${timestamp}.dump"

Write-Host "[BACKUP] Kreiranje PostgreSQL binarnog dump-a ($dumpFile)..." -ForegroundColor Cyan
docker exec $ContainerName pg_dump -U $DbUser -F c $DbName > $dumpFile

if (-not (Test-Path $dumpFile) -or (Get-Item $dumpFile).Length -eq 0) {
    throw "Backup fajl je prazan ili nije kreiran!"
}

$hash = (Get-FileHash -Path $dumpFile -Algorithm SHA256).Hash
"$hash  $(Split-Path $dumpFile -Leaf)" | Set-Content -Path "$dumpFile.sha256"

Write-Host "[BACKUP] Uspešno završen backup. SHA-256: $hash" -ForegroundColor Green
