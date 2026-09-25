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

const importButtonStr = "import { Button } from '@/design-system/Button';\n";

let replacedCount = 0;

walk('./src', (filePath) => {
  if (!filePath.match(/\.tsx?$/)) return;
  if (filePath.includes('Button.tsx')) return;
  if (filePath.includes('.story.') || filePath.includes('.stories.')) return;
  if (filePath.includes('.spec.')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;

  let changed = false;

  newContent = newContent.replace(/<button([\s\S]*?)>([\s\S]*?)<\/button>/g, (match, attrs, inner) => {
    // Determine variant based on attrs
    let variant = 'default';
    if (attrs.includes('bg-blue-600') || attrs.includes('bg-brand-accent') || attrs.includes('brand-accent')) variant = 'accent';
    else if (attrs.includes('text-red-') || attrs.includes('bg-red-')) variant = 'danger';
    else if (attrs.includes('bg-slate-900')) variant = 'primary';
    else if (attrs.includes('bg-white') && attrs.includes('border')) variant = 'secondary';
    else if (attrs.includes('bg-transparent') || !attrs.includes('bg-')) variant = 'ghost';

    let isIconOnly = inner.trim().startsWith('<') && inner.trim().endsWith('>') && !inner.includes('span');

    let size = 'md';
    if (attrs.includes('text-xs') || attrs.includes('h-8') || attrs.includes('text-[11px]')) size = 'sm';
    if (attrs.includes('w-6') && attrs.includes('h-6')) size = 'xs';

    let extraProps = '';
    if (variant !== 'default') extraProps += ` variant="${variant}"`;
    if (size !== 'md') extraProps += ` size="${size}"`;
    if (isIconOnly) {
      extraProps += ` iconOnly`;
      if (!attrs.includes('aria-label') && !attrs.includes('title')) {
        extraProps += ` aria-label="Action button"`;
      }
    }
    
    // strip out some repetitive classes if we use default Button styles. 
    // Wait, let's keep className, twMerge will handle. Actually `bg-transparent` shouldn't override `bg-blue-600` so we should just keep it.

    changed = true;
    replacedCount++;
    return `<Button${attrs}${extraProps}>${inner}</Button>`;
  });

  if (changed) {
    if (!newContent.includes('import { Button }')) {
      newContent = "import { Button } from '@/src/design-system';\n" + newContent;
    }
    fs.writeFileSync(filePath, newContent);
  }
});

console.log('Replaced', replacedCount, 'buttons');
