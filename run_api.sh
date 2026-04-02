#!/bin/bash
# ECU Binary Compare - API Launcher
# Run this script to start the Flask API server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/api"

echo "=========================================="
echo "  ECU Binary Compare - API Launcher"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found!"
    echo "   Download from: https://www.python.org/downloads/"
    exit 1
fi

echo "Python found:"
python3 --version

# Install dependencies if needed
if [ ! -f "$API_DIR/venv/pyvenv.cfg" ]; then
    echo ""
    echo "Creating virtual environment..."
    cd "$API_DIR"
    python3 -m venv venv
fi

# Activate venv and install requirements
echo ""
echo "Activating virtual environment..."
source "$API_DIR/venv/bin/activate"

if [ -f "$API_DIR/requirements.txt" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the server
echo ""
echo "Starting ECU Binary Compare API..."
echo "   Web UI: http://localhost:5000"
echo "   API:   http://localhost:5000/api"
echo ""
cd "$API_DIR"
python3 ecu_compare.py
