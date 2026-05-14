#!/usr/bin/env pwsh
# Recro AI - One-click development startup script (Windows PowerShell)
# Usage: .\start-dev.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ██████╗ ███████╗███████╗██╗   ██╗███╗   ███╗███████╗" -ForegroundColor Cyan
Write-Host "  ██╔══██╗██╔════╝██╔════╝██║   ██║████╗ ████║██╔════╝" -ForegroundColor Cyan
Write-Host "  ██████╔╝█████╗  ███████╗██║   ██║██╔████╔██║█████╗  " -ForegroundColor Cyan
Write-Host "  ██╔══██╗██╔══╝  ╚════██║██║   ██║██║╚██╔╝██║██╔══╝  " -ForegroundColor Cyan
Write-Host "  ██║  ██║███████╗███████║╚██████╔╝██║ ╚═╝ ██║███████╗" -ForegroundColor Cyan
Write-Host "  ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Recro AI — Development Setup" -ForegroundColor White
Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ─── Prerequisite checks ────────────────────────────────────────────────────

function Check-Command {
    param([string]$Name, [string]$InstallUrl)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "  [✗] $Name not found." -ForegroundColor Red
        Write-Host "      Install from: $InstallUrl" -ForegroundColor Yellow
        exit 1
    }
    $version = & $Name --version 2>&1 | Select-Object -First 1
    Write-Host "  [✓] $Name — $version" -ForegroundColor Green
}

Write-Host "  Checking prerequisites..." -ForegroundColor DarkGray
Check-Command "python"  "https://python.org"
Check-Command "node"    "https://nodejs.org"
Check-Command "uv"      "https://docs.astral.sh/uv/getting-started/installation/"
Write-Host ""

# ─── Backend .env setup ────────────────────────────────────────────────────

$FrontendDir = Join-Path $PSScriptRoot "apps\frontend"
$EnvFile     = Join-Path $FrontendDir ".env"
$EnvExample  = Join-Path $FrontendDir ".env.example"

if (-not (Test-Path $EnvFile)) {
    Write-Host "  [i] Creating .env from .env.example..." -ForegroundColor Blue
    Copy-Item $EnvExample $EnvFile
    Write-Host "  [✓] .env created. Edit it or use the Settings UI to configure your AI provider." -ForegroundColor Green
} else {
    Write-Host "  [✓] .env already exists." -ForegroundColor Green
}
Write-Host ""

# ─── Install Python backend dependencies ──────────────────────────────────

Write-Host "  [i] Installing Python dependencies (uv sync)..." -ForegroundColor Blue
Push-Location $FrontendDir
uv sync
Pop-Location
Write-Host "  [✓] Backend dependencies installed." -ForegroundColor Green
Write-Host ""

# ─── Install frontend dependencies ─────────────────────────────────────────

Write-Host "  [i] Installing Node.js dependencies (npm install)..." -ForegroundColor Blue
Push-Location $FrontendDir
npm install --silent
Pop-Location
Write-Host "  [✓] Frontend dependencies installed." -ForegroundColor Green
Write-Host ""

# ─── Start servers ─────────────────────────────────────────────────────────

Write-Host "  Starting servers..." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Backend  → http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Frontend → http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Settings → http://localhost:3000/settings  (configure your AI key here)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

# Start Python backend (FastAPI via uvicorn) in a new window
$BackendCmd = "cd `"$FrontendDir`"; .venv\Scripts\python.exe -m uvicorn api.app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd -WindowStyle Normal

# Small delay to let backend start first
Start-Sleep -Seconds 3

# Start frontend in current window (so Ctrl+C works naturally)
Push-Location $FrontendDir
npm run dev
Pop-Location
