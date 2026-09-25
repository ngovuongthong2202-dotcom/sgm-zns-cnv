const fs = require('fs');
const execSync = require('child_process').execSync;
execSync('grep -roE "text-\\[[0-9]+(\\.5)?px\\]" src/ > /tmp/text_classes.txt', { stdio: 'ignore', shell: '/bin/bash' });
const texts = fs.readFileSync('/tmp/text_classes.txt', 'utf-8').split('\n').filter(Boolean);
const counts = {};
texts.forEach(t => {
  const c = t.split(':')[1];
  counts[c] = (counts[c] || 0) + 1;
});
console.log(Object.entries(counts).sort((a,b) => b[1] - a[1]));
