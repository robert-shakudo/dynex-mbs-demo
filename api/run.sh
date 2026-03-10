#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
pip install -q -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8787 --workers 1
