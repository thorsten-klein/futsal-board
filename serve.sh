#!/bin/bash
# Simple HTTP server to serve the app

PORT=8000

echo "Starting on http://localhost:$PORT"
echo "Press Ctrl+C to stop"

if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
else
    echo "Error: Python not found. Please install Python to run the server."
    exit 1
fi
