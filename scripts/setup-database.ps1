# Run from the project folder after npm ci and npm run db:generate.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$connection = Read-Host 'Prisma Postgres direct PostgreSQL connection URL' -AsSecureString
$ownerSecret = Read-Host 'Password for Aravind' -AsSecureString
try {
    $env:DIRECT_DATABASE_URL = [System.Net.NetworkCredential]::new('', $connection).Password
    $env:OWNER_USERNAME = 'Aravind'
    $env:OWNER_PASSWORD = [System.Net.NetworkCredential]::new('', $ownerSecret).Password
    node scripts/prepare-database.mjs --sample
    if ($LASTEXITCODE -ne 0) { throw 'Database setup failed. Review the error above.' }
} finally {
    Remove-Item Env:DIRECT_DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:OWNER_USERNAME -ErrorAction SilentlyContinue
    Remove-Item Env:OWNER_PASSWORD -ErrorAction SilentlyContinue
}
