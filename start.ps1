Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
docker compose up -d db
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker container. Is Docker Desktop running?" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for database..." -ForegroundColor Yellow
$attempts = 0
while ($attempts -lt 30) {
    docker exec qms_postgres pg_isready -U qms 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    $attempts++
    Start-Sleep -Seconds 2
}
if ($attempts -eq 30) {
    Write-Host "Database did not become ready in time." -ForegroundColor Red
    exit 1
}
Write-Host "Database ready!" -ForegroundColor Green

Write-Host "Running migrations and seed..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\qms-server"
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
Pop-Location

Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\qms-server'; npm run dev" -WindowStyle Normal

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "  Database:  localhost:5435"
Write-Host "  Backend:   http://localhost:3001"
Write-Host "  Frontend:  http://localhost:5173"
Write-Host "==========================================" -ForegroundColor Green
