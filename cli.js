#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptDir = __dirname;

if (process.platform === 'win32') {
  // Windows: WSL2 経由か PowerShell スクリプトを試行
  const psScript = path.join(scriptDir, 'setup-harness.ps1');
  if (fs.existsSync(psScript)) {
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
        stdio: 'inherit',
        env: { ...process.env }
      });
    } catch (e) {
      process.exit(1);
    }
  } else {
    console.error('❌ setup-harness.ps1 not found at:', psScript);
    console.error('   Windows では WSL2 または Git Bash を使用してください。');
    process.exit(1);
  }
  process.exit(0);
}

const setupScript = path.join(scriptDir, 'opencode', 'setup-harness.sh');

if (!fs.existsSync(setupScript)) {
  console.error('❌ setup-harness.sh not found at:', setupScript);
  process.exit(1);
}

try {
  execSync(`bash "${setupScript}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      YORI_PATH: path.join(scriptDir, 'opencode')
    }
  });
} catch (e) {
  process.exit(1);
}
