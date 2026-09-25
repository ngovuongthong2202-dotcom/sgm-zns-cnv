const execSync = require('child_process').execSync;
try {
  execSync('grep -rI "class(Name)*=\"[^\"]*bg-slate-50 border border-slate-[12]00[^\"]*rounded" src/ > /tmp/inputs.txt', { shell: '/bin/bash' });
} catch(e) {} // ignore if not found or errors
const lines = require('fs').readFileSync('/tmp/inputs.txt', 'utf-8').split('\n').filter(Boolean);
console.log(lines.slice(0, 5).join('\n'));
