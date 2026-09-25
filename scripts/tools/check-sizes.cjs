const fs = require('fs');
const execSync = require('child_process').execSync;
execSync('grep -roE "size-\\[[0-9]+(\\.5)?px\\]" src/ > /tmp/size_classes.txt || true', { stdio: 'ignore', shell: '/bin/bash' });
execSync('grep -roE "w-\\[[0-9]+(\\.5)?px\\] h-\\[[0-9]+(\\.5)?px\\]" src/ >> /tmp/size_classes.txt || true', { stdio: 'ignore', shell: '/bin/bash' });
const sizes = fs.readFileSync('/tmp/size_classes.txt', 'utf-8').split('\n').filter(Boolean);
const counts = {};
sizes.forEach(s => {
  const c = s.split(':')[1];
  counts[c] = (counts[c] || 0) + 1;
});
console.log(Object.entries(counts).sort((a,b) => b[1] - a[1]));
