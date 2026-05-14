#!/usr/bin/env bash
# Recro AI — One-click development startup script (macOS/Linux)
# Usage: ./start-dev.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}  ██████╗ ███████╗███████╗██╗   ██╗███╗   ███╗███████╗${NC}"
echo -e "${CYAN}  ██╔══██╗██╔════╝██╔════╝██║   ██║████╗ ████║██╔════╝${NC}"
echo -e "${CYAN}  ██████╔╝█████╗  ███████╗██║   ██║██╔████╔██║█████╗  ${NC}"
echo -e "${CYAN}  ██╔══██╗██╔══╝  ╚════██║██║   ██║██║╚██╔╝██║██╔══╝  ${NC}"
echo -e "${CYAN}  ██║  ██║███████╗███████║╚██████╔╝██║ ╚═╝ ██║███████╗${NC}"
echo -e "${CYAN}  ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝${NC}"
echo ""
echo -e "${BOLD}  Recro AI — Development Setup${NC}"
echo -e "  ─────────────────────────────────────────────────────"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/apps/backend"
FRONTEND_DIR="$SCRIPT_DIR/apps/frontend"

# ─── Prerequisite checks ──────────────────────────────────────────────────

check_cmd() {
    local name="$1"
    local url="$2"
    if ! command -v "$name" &>/dev/null; then
        echo -e "  ${RED}[✗]${NC} ${BOLD}$name${NC} not found."
        echo -e "      Install from: $url"
        exit 1
    fi
    echo -e "  ${GREEN}[✓]${NC} $name — $($name --version 2>&1 | head -1)"
}

echo -e "  Checking prerequisites..."
check_cmd python3   "https://python.org"
check_cmd node      "https://nodejs.org"
check_cmd uv        "https://docs.astral.sh/uv/getting-started/installation/"
echo ""

# ─── Backend .env setup ───────────────────────────────────────────────────

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "  ${BLUE}[i]${NC} Creating .env from .env.example..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "  ${GREEN}[✓]${NC} .env created. Edit it or use the Settings UI to configure your AI provider."
else
    echo -e "  ${GREEN}[✓]${NC} .env already exists."
fi
echo ""

# ─── Install backend dependencies ─────────────────────────────────────────

echo -e "  ${BLUE}[i]${NC} Installing Python dependencies..."
(cd "$BACKEND_DIR" && uv sync)
echo -e "  ${GREEN}[✓]${NC} Backend dependencies installed."
echo ""

# ─── Install frontend dependencies ─────────────────────────────────────────

echo -e "  ${BLUE}[i]${NC} Installing Node.js dependencies..."
(cd "$FRONTEND_DIR" && npm install --silent)
echo -e "  ${GREEN}[✓]${NC} Frontend dependencies installed."
echo ""

# ─── Start servers ────────────────────────────────────────────────────────

echo -e "  ${BOLD}Starting servers...${NC}"
echo ""
echo -e "  Backend  → ${YELLOW}http://localhost:8000${NC}"
echo -e "  Frontend → ${YELLOW}http://localhost:3000${NC}"
echo -e "  Settings → ${CYAN}http://localhost:3000/settings${NC}  ${BOLD}← configure your AI key here${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop both servers."
echo ""

# Cleanup handler
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "  ${YELLOW}[!]${NC} Shutting down..."
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    wait
    echo -e "  ${GREEN}[✓]${NC} Done."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend in background
(cd "$BACKEND_DIR" && uv run app) &
BACKEND_PID=$!

# Brief pause so backend logs don't interleave with frontend startup
sleep 2

# Start frontend in background
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

# Wait for either process to exit
wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
cleanup
