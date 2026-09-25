const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find files containing features/customers
const output = execSync('grep -rl "features/customers" src/').toString();
const files = output.split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/features\/customers/g, 'modules/customers/ui');
  fs.writeFileSync(file, content);
}
console.log('Replaced features/customers -> modules/customers/ui in ', files.length, ' files');
