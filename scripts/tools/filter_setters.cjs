const fs = require('fs');
const lines = fs.readFileSync('setters.txt', 'utf8').split('\n');
const mapped = lines.filter(l => {
  if (!l) return false;
  if (l.includes('=>')) return false;
  if (l.includes('useEffect')) return false;
  if (l.includes('onClick')) return false;
  if (l.includes('onChange')) return false;
  if (l.includes('return ')) return false;
  if (l.includes('onClose')) return false;
  if (l.includes('setTimeout')) return false;
  if (l.includes('.then')) return false;
  if (l.includes('.catch')) return false;
  if (l.includes('function ')) return false;
  if (l.includes('Promise')) return false;
  if (l.includes('onSubmit')) return false;
  return true;
});
console.log(mapped.join('\n'));
