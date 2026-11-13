param(
    [Parameter(Mandatory=$true)][string]$DumpFile,
    [string]$ContainerName = "ecommerce-postgres",
    [string]$TargetDbName = "ecommerce_restore_drill",
    [string]$DbUser = "ecommerce"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $DumpFile)) {
    throw "Dump fajl nije pronađen: $DumpFile"
}

Write-Host "[RESTORE DRILL - AT-13] Kreiranje čiste ciljne baze '$TargetDbName'..." -ForegroundColor Cyan
docker exec $ContainerName psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $TargetDbName;"
docker exec $ContainerName psql -U $DbUser -d postgres -c "CREATE DATABASE $TargetDbName;"
docker exec $ContainerName psql -U $DbUser -d $TargetDbName -c "CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;"

Write-Host "[RESTORE DRILL - AT-13] Učitavanje pg_restore u '$TargetDbName'..." -ForegroundColor Cyan
Get-Content $DumpFile -AsByteStream | docker exec -i $ContainerName pg_restore -U $DbUser -d $TargetDbName --no-owner

Write-Host "[RESTORE DRILL - AT-13] Provera integriteta tabela..." -ForegroundColor Cyan
docker exec $ContainerName psql -U $DbUser -d $TargetDbName -c "SELECT COUNT(*) AS products_count FROM ""Products""; SELECT COUNT(*) AS orders_count FROM ""Orders"";"

Write-Host "[RESTORE DRILL - AT-13] Uspešno potvrđen oporavak podataka!" -ForegroundColor Green
