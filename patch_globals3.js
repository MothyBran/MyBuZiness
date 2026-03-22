const fs = require('fs');
const file = 'app/globals.css';
let content = fs.readFileSync(file, 'utf8');

// We want to extract the :root light overrides:
const lightBlock = `    /* Neutral / Grays (Light Mode Defaults) */
    --bg: #f8fafc;            /* Slate-50 */
    --panel: #ffffff;         /* White */
    --panel-2: #f1f5f9;       /* Slate-100 */
    --border: #e2e8f0;        /* Slate-200 */
    --text: #0f172a;          /* Slate-900 */
    --text-weak: #475569;     /* Slate-600 */
    --muted: #64748b;         /* Slate-500 */

    --shadow-1: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-2: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);`;

const regex = /@media \(prefers-color-scheme: light\) \{\n  :root \{[\s\S]*?\}\n\}/;
const changes = `
:root.theme-light {
${lightBlock}
}

@media (prefers-color-scheme: light) {
  :root:not(.theme-dark) {
${lightBlock}
  }
}
`;

content = content.replace(regex, changes);
fs.writeFileSync(file, content);
