const fs = require('fs');
const file = 'app/belege/[id]/druck/page.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove the afterprint effect
const blockToRemove = `  useEffect(() => {
    if (autoPrint) {
      const handleAfterPrint = () => {
        window.close();
      };
      window.addEventListener('afterprint', handleAfterPrint);
      return () => window.removeEventListener('afterprint', handleAfterPrint);
    }
  }, [autoPrint]);`;

content = content.replace(blockToRemove, '');

fs.writeFileSync(file, content);
console.log('Patched');
