# Starts the database, prepares it, and opens the backend and frontend in new windows.
# Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1

Set-Location $PSScriptRoot

function Fail($message) {
    Write-Host $message -ForegroundColor Red
    exit 1
}

# Prerequisites
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Install Node 20.19+ or 22.12+ from https://nodejs.org"
}
$nodeVersion = [version]((node -v).TrimStart("v"))
$nodeOk = ($nodeVersion.Major -eq 20 -and $nodeVersion.Minor -ge 19) -or
          ($nodeVersion.Major -eq 22 -and $nodeVersion.Minor -ge 12) -or
          ($nodeVersion.Major -gt 22)
if (-not $nodeOk) {
    Fail "Node $nodeVersion is too old. This project needs Node 20.19+ or 22.12+."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
}
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fail "Docker is installed but not running. Start Docker Desktop and try again."
}

if (-not (Test-Path "qms-server\.env")) {
    Copy-Item "qms-server\.env-example" "qms-server\.env"
    Write-Host "Created qms-server\.env from .env-example" -ForegroundColor Yellow
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
}
if (-not (Test-Path "qms-server\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Push-Location "qms-server"
    npm install
    $installExit = $LASTEXITCODE
    Pop-Location
    if ($installExit -ne 0) { Fail "npm install failed in qms-server." }
}

# Database
Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
docker compose up -d db
if ($LASTEXITCODE -ne 0) { Fail "Could not start the database container." }

Write-Host "Waiting for database..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    docker exec qms_postgres pg_isready -U qms 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Fail "Database did not become ready within 60 seconds. Check: docker compose logs db" }
Write-Host "Database ready!" -ForegroundColor Green

Write-Host "Running migrations and seed..." -ForegroundColor Cyan
Push-Location "qms-server"
npx prisma generate
if ($LASTEXITCODE -eq 0) { npx prisma migrate deploy }
if ($LASTEXITCODE -eq 0) { npx prisma db seed }
$setupExit = $LASTEXITCODE
Pop-Location
if ($setupExit -ne 0) { Fail "Database setup failed (see the errors above)." }

# Servers
Write-Host "Starting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\qms-server'; npm run dev" -WindowStyle Normal

Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "  App:       http://localhost:5173"
Write-Host "  Login:     admin@example.com / admin123"
Write-Host "  API:       http://localhost:3001"
Write-Host "  Database:  localhost:5435"
Write-Host "  Close the two new windows to stop the servers."
Write-Host "==========================================" -ForegroundColor Green
