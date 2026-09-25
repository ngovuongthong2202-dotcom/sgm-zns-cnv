const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) walk(filePath, callback);
    else callback(filePath);
  });
};

const textSizeMap = {
  '8': 'text-3xs', '8.5': 'text-3xs', '9': 'text-3xs',
  '9.5': 'text-2xs', '10': 'text-2xs', '10.5': 'text-2xs', '11': 'text-2xs', '11.5': 'text-2xs',
  '12': 'text-xs', '12.5': 'text-xs', '13': 'text-xs',
  '14': 'text-sm', '15': 'text-sm',
  '16': 'text-base',
  '18': 'text-lg',
  '19': 'text-xl', '20': 'text-xl',
  '24': 'text-2xl', '25': 'text-2xl', '26': 'text-2xl',
  '30': 'text-3xl'
};

const iconSizeMap = {
  '10': '10', '11': '10',
  '12': '12', '13': '12',
  '14': '14', '15': '14',
  '16': '16',
  '18': '16', // or maybe 20? Let's use standard lucide sizes maybe '16' is default. size="sm"? No, size are numbers in lucide. let's just make it step-like.
  // Tailwind default sizes: 3=12px, 4=16px, 5=20px, 6=24px, etc. 
  // Wait, if size={xx} is used on lucide-react, we can pass integer size.
};

let replacedTextCount = 0;
let replacedIconCount = 0;

walk('./src', (filePath) => {
  if (!filePath.match(/\.tsx?$/)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;

  // text-[px] substitution
  newContent = newContent.replace(/text-\[([0-9]+(?:\.[0-9]+)?)px\]/g, (match, size) => {
    if (textSizeMap[size]) {
      replacedTextCount++;
      return textSizeMap[size];
    }
    return match;
  });
  
  // size={px} substitution for icons
  newContent = newContent.replace(/size=\{([0-9]+(?:\.[0-9]+)?)\}/g, (match, size) => {
    let numSize = parseFloat(size);
    let newSize = numSize;
    if (numSize < 12) newSize = 10;
    else if (numSize < 14) newSize = 12;
    else if (numSize < 16) newSize = 14;
    else if (numSize <= 18) newSize = 16;
    else if (numSize <= 22) newSize = 20;
    else if (numSize <= 28) newSize = 24;
    else if (numSize <= 36) newSize = 32;
    // more than that leave original or mapping
    if (newSize !== numSize) {
       replacedIconCount++;
       return `size={${newSize}}`;
    }
    return match;
  });
  
  // w-[xxpx] h-[xxpx] size mapping
  newContent = newContent.replace(/w-\[([0-9]+(?:\.[0-9]+)?)px\] h-\[\1px\]/g, (match, size) => {
    let numSize = parseFloat(size);
    let newSize = numSize;
    if (numSize < 12) newSize = 10;
    else if (numSize < 14) newSize = 12;
    else if (numSize <= 18) newSize = 16;
    if (newSize !== numSize) {
      if (newSize === 10) return 'w-2.5 h-2.5';
      if (newSize === 12) return 'w-3 h-3';
      if (newSize === 16) return 'w-4 h-4';
    }
    return match;
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
  }
});
console.log('Text formats normalized:', replacedTextCount);
console.log('Icon sizes normalized:', replacedIconCount);
