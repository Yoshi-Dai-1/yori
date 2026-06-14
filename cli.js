#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptDir = __dirname;
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
