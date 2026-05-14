#!/usr/bin/env node
/**
 * start-api.js — Cross-platform helper to launch the FastAPI backend
 * from npm scripts. Uses the .venv Python so all installed packages
 * (litellm, fastapi, etc.) are available regardless of system Python.
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const pythonBin = isWindows
  ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
  : path.join(__dirname, '.venv', 'bin', 'python');

const args = ['-m', 'uvicorn', 'api.app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'];

const proc = spawn(pythonBin, args, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: false,
});

proc.on('error', (err) => {
  console.error('[api] Failed to start Python backend:', err.message);
  console.error('[api] Make sure you ran: uv sync  (or pip install -r requirements.txt) inside apps/frontend/');
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
