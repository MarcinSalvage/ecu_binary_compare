#!/bin/bash

# ECU Binary Compare - Mac Launcher
# Save this file and run: chmod +x run_mac.command

echo "=========================================="
echo "  ECU Binary Compare - Mac Launcher"
echo "=========================================="
echo ""

API_DIR="$(cd "$(dirname "$0")/api" && pwd)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    echo "   Download from: https://www.python.org/downloads/"
    exit 1
fi

echo "✓ Python found"
python3 --version

# Install dependencies if needed
if [ ! -d "$API_DIR/venv" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    cd "$API_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo "✓ Dependencies installed"
fi

# Start the server
echo ""
echo "🚀 Starting ECU Binary Compare API..."
echo "   Open http://localhost:5000 in your browser"
echo ""
cd "$API_DIR"
source venv/bin/activate
python3 ecu_compare.py
