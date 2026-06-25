#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ██╗   ██╗████████╗      ██████╗ ██╗     ██████╗ "
echo "  ╚██╗ ██╔╝╚══██╔══╝      ██╔══██╗██║     ██╔══██╗"
echo "   ╚████╔╝    ██║         ██║  ██║██║     ██████╔╝"
echo "    ╚██╔╝     ██║         ██║  ██║██║     ██╔═══╝ "
echo "     ██║      ██║         ██████╔╝███████╗██║     "
echo "     ╚═╝      ╚═╝         ╚═════╝ ╚══════╝╚═╝     "
echo -e "  Web UI - Video Download System${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python3 not found. Please install Python 3.10+${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo -e "${GREEN}[OK]${NC} Python $PYTHON_VERSION"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}[OK]${NC} Node.js $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm not found.${NC}"
    exit 1
fi

echo -e "${GREEN}[OK]${NC} npm $(npm --version)"
echo ""

# Setup backend virtual environment
echo -e "${CYAN}[1/4] Setting up backend...${NC}"
cd "$SCRIPT_DIR/backend"

if [ -d "venv" ]; then
    echo -e "  Virtual environment exists, checking..."
    source venv/bin/activate
    if ! python3 -c "import fastapi" 2>/dev/null; then
        echo -e "  ${YELLOW}Dependencies missing, reinstalling...${NC}"
        deactivate
        rm -rf venv
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip -q
        pip install -r requirements.txt -q
    fi
else
    echo -e "  Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
fi

echo -e "  ${GREEN}[OK]${NC} Backend dependencies ready"

# Setup frontend
echo -e "${CYAN}[2/4] Setting up frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "  Installing npm dependencies..."
    npm install --silent
fi

echo -e "  ${GREEN}[OK]${NC} Frontend dependencies ready"

# Start backend
echo -e "${CYAN}[3/4] Starting backend server...${NC}"
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
mkdir -p data downloads
python3 main.py &
BACKEND_PID=$!
echo -e "  ${GREEN}[OK]${NC} Backend started (PID: $BACKEND_PID) on http://localhost:8200"

# Wait for backend to be ready
echo -n "  Waiting for backend..."
for i in $(seq 1 30); do
    if curl -s http://localhost:8200/api/health > /dev/null 2>&1; then
        echo -e " ${GREEN}ready!${NC}"
        break
    fi
    sleep 1
    echo -n "."
done

# Start frontend
echo -e "${CYAN}[4/4] Starting frontend server...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo -e "  ${GREEN}[OK]${NC} Frontend started (PID: $FRONTEND_PID) on http://localhost:3200"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  System is running!${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3200${NC}"
echo -e "${GREEN}  Backend:  http://localhost:8200${NC}"
echo -e "${GREEN}  API Docs: http://localhost:8200/docs${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Press Ctrl+C to stop all services"

# Trap to cleanup
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Done.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

wait
