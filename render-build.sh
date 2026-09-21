#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "=== CivicSeva Render Build Starting ==="

# 1. Install Backend Dependencies
echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r backend/requirements.txt

# 2. Build React Vite Frontend
echo "=== Building React Vite Frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== CivicSeva Build Completed Successfully ==="
