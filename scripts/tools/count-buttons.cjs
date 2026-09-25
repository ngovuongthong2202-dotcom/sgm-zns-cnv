const fs = require('fs');
const execSync = require('child_process').execSync;
execSync('grep -rI "<button" src/ > /tmp/buttons.txt || true', { stdio: 'ignore', shell: '/bin/bash' });
const lines = fs.readFileSync('/tmp/buttons.txt', 'utf-8').split('\n').filter(Boolean);
console.log('Total raw <button>:', lines.length);
