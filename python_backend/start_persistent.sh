#!/bin/bash
while true; do
  echo '🚀 Starting Python backend...'
  python main.py
  echo '⚠️ Backend crashed, restarting in 3 seconds...'
  sleep 3
done
