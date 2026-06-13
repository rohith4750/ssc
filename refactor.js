const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src', 'app', '(dashboard)');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.tsx')) {
      processFile(filePath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Replace alert(...)
  content = content.replace(/alert\((['"`])(.*Failed.*)(['"`])\)/gi, "toast.error($1$2$3)");
  content = content.replace(/alert\((['"`])(.*)(['"`])\)/g, (match, p1, p2, p3) => {
    if (match.includes('toast.error')) return match; // already replaced
    return `toast.success(${p1}${p2}${p3})`;
  });

  // 2. Add import for toast if needed
  if (content.includes('toast.') && !content.includes("from 'react-hot-toast'")) {
    // Add import after the last import statement or at top
    if (content.includes("import ")) {
      content = content.replace(/(import .* from ['"].*['"];?\n)/, "$1import { toast } from 'react-hot-toast';\n");
    } else {
      content = `import { toast } from 'react-hot-toast';\n` + content;
    }
  }

  // 3. Wrap <table> with overflow-x-auto div
  // We need to be careful not to double wrap.
  if (content.includes('<table') && !content.includes('overflow-x-auto')) {
    content = content.replace(/<table([^>]*)>/g, '<div className="w-full overflow-x-auto border border-white/5 rounded-xl scrollbar-thin mb-4"><table$1>');
    content = content.replace(/<\/table>/g, '</table></div>');
  }

  // 4. Update flex justify-between
  // Look for: className="... flex justify-between ..."
  // Replace with flex-col sm:flex-row gap-4
  // We'll target specifically: flex justify-between items-center
  content = content.replace(/className="([^"]*)flex justify-between items-center([^"]*)"/g, (match, p1, p2) => {
    if (match.includes('sm:flex-row') || match.includes('flex-col')) return match;
    return `className="${p1}flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3${p2}"`;
  });

  content = content.replace(/className="([^"]*)flex justify-between items-start([^"]*)"/g, (match, p1, p2) => {
    if (match.includes('sm:flex-row') || match.includes('flex-col')) return match;
    return `className="${p1}flex flex-col sm:flex-row justify-between items-start gap-3${p2}"`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

processDirectory(directory);
