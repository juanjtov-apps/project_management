#!/usr/bin/env node

/**
 * Production startup script for Proesphere
 * Handles both Node.js Express server and Python FastAPI backend
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Proesphere in production mode...');

// Set production environment
process.env.NODE_ENV = 'production';

// Get ports from environment or use defaults
const EXPRESS_PORT = process.env.PORT || '5000';
const PYTHON_PORT = process.env.PYTHON_PORT || '8000';

console.log(`Express server will run on port ${EXPRESS_PORT}`);
console.log(`Python backend will run on port ${PYTHON_PORT}`);

// Start Python FastAPI backend
console.log('🐍 Starting Python FastAPI backend...');
const pythonProcess = spawn('python', ['main.py'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: PYTHON_PORT,
    NODE_ENV: 'production'
  }
});

pythonProcess.on('error', (error) => {
  console.error('❌ Failed to start Python backend:', error);
  process.exit(1);
});

pythonProcess.on('close', (code) => {
  console.log(`🐍 Python backend exited with code ${code}`);
  if (code !== 0) {
    console.error('❌ Python backend failed');
    process.exit(1);
  }
});

// Wait a moment for Python backend to start
setTimeout(() => {
  console.log('🌐 Starting Express server...');
  
  // Start Express server
  const expressProcess = spawn('node', ['dist/index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: EXPRESS_PORT,
      NODE_ENV: 'production'
    }
  });

  expressProcess.on('error', (error) => {
    console.error('❌ Failed to start Express server:', error);
    pythonProcess.kill();
    process.exit(1);
  });

  expressProcess.on('close', (code) => {
    console.log(`🌐 Express server exited with code ${code}`);
    pythonProcess.kill();
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    expressProcess.kill('SIGTERM');
    pythonProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    expressProcess.kill('SIGINT');
    pythonProcess.kill('SIGINT');
  });

}, 3000); // Give Python 3 seconds to start