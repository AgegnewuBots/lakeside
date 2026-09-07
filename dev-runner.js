const { spawn } = require('child_process');
const path = require('path');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
console.log(`${BOLD}${CYAN}  LAKESIDE SCHOOL MANAGEMENT SYSTEM - FULL DEV STACK LAUNCHER           ${RESET}`);
console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
console.log(`  ${GREEN}✓ School Name:${RESET}      Lakeside School`);
console.log(`  ${GREEN}✓ Backend Server:${RESET}   http://localhost:3001`);
console.log(`  ${GREEN}✓ Frontend Web App:${RESET} http://localhost:5173`);
console.log(`  ${YELLOW}* Admin Login:${RESET}      Username: ${BOLD}admin${RESET}       Password: ${BOLD}age1324${RESET}`);
console.log(`  ${YELLOW}* Directory Login:${RESET}  Username: ${BOLD}registrar${RESET}   Password: ${BOLD}dir123${RESET}`);
console.log(`  ${YELLOW}* Teacher Login:${RESET}    Username: ${BOLD}abebe${RESET}       Password: ${BOLD}teach123${RESET}`);
console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

// 1. Launch Backend API Server (port 3001)
const serverProc = spawn('node', ['server/src/index.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// 2. Launch Vite Client Dev Server (port 5173)
const isWin = process.platform === 'win32';
const clientCommand = isWin ? 'cmd.exe' : 'npm';
const clientArgs = isWin ? ['/c', 'npm', 'run', 'dev'] : ['run', 'dev'];

const clientProc = spawn(clientCommand, clientArgs, {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log(`\n${YELLOW}Shutting down Lakeside School Management System services...${RESET}`);
  try {
    if (serverProc) serverProc.kill();
    if (clientProc) clientProc.kill();
  } catch (err) {
    // Ignore cleanup errors
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
