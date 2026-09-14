# Applies supabase/migrations/*.sql in filename order to the self-hosted stack
# database (docker container supabase-db). Keeps a ledger in
# public.schema_migrations so re-runs apply only what is missing.
#
# Usage:
#   pwsh scripts/apply-migrations.ps1            # apply missing migrations
#   pwsh scripts/apply-migrations.ps1 -List      # show files + applied state
#
# Requires: Docker engine running, stack up (supabase-db container healthy).
# NOTE: for a truly fresh database, recreate the stack volumes instead:
#   docker compose down -v   (in infra/supabase/)  — then start + apply.

param(
    [string]$Container = "supabase-db",
    [switch]$List,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$migDir = Join-Path $PSScriptRoot "..\supabase\migrations"

function Invoke-Psql([string]$Sql) {
    $out = $Sql | docker exec -i $Container psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -t -A 2>&1
    if ($LASTEXITCODE -ne 0) { throw "psql failed: $out" }
    return $out
}

# 0. Check container is reachable
$null = docker exec $Container pg_isready -U supabase_admin -d postgres 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Container '$Container' not reachable. Is the stack up? (docker ps)"
}

# 1. Ensure ledger table exists
Invoke-Psql @"
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
"@ | Out-Null

$applied = @(Invoke-Psql "SELECT version FROM public.schema_migrations ORDER BY version;")
$appliedSet = @{}
foreach ($v in $applied) { if ($v) { $appliedSet[$v.Trim()] = $true } }

# 2. Walk files in order
$files = Get-ChildItem $migDir -Filter *.sql | Sort-Object Name
$pendingCount = 0
foreach ($f in $files) {
    $name = $f.Name
    $isEmpty = [string]::IsNullOrWhiteSpace((Get-Content $f.FullName -Raw))
    $state = if ($appliedSet.ContainsKey($name)) { "APPLIED" }
             elseif ($isEmpty)                    { "EMPTY  " }
             else                                 { "PENDING" }
    if ($state -eq "PENDING") { $pendingCount++ }
    if ($List) {
        Write-Host ("{0}  {1}" -f $state, $name)
    }
}

if ($List) { Write-Host "`n$pendingCount pending migration file(s)."; exit 0 }

foreach ($f in $files) {
    $name = $f.Name
    if ($appliedSet.ContainsKey($name)) { Write-Host "SKIP (applied): $name"; continue }
    if ([string]::IsNullOrWhiteSpace((Get-Content $f.FullName -Raw))) {
        Write-Host "SKIP (empty):   $name"
        $null = Invoke-Psql "INSERT INTO public.schema_migrations (version) VALUES ('$name');"
        continue
    }
    if ($DryRun) { Write-Host "WOULD APPLY:    $name"; continue }

    Write-Host "APPLY:          $name"
    $sql = Get-Content $f.FullName -Raw
    $sql += "`nINSERT INTO public.schema_migrations (version) VALUES ('$name');"
    $result = $sql | docker exec -i $Container psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host $result
        throw "Migration FAILED: $name (database may be partially migrated - inspect before retrying)"
    }
    Write-Host ($result | Select-Object -Last 5)
}

Write-Host "`nDone."
