const fs = require('fs');
const file = 'app/globals.css';
let content = fs.readFileSync(file, 'utf8');

const regex = /@media \(prefers-color-scheme: light\) \{/
const changes = `:root.theme-light,
@media (prefers-color-scheme: light) {
  :root:not(.theme-dark) {`

content = content.replace(regex, changes);
content = content.replace(/\}[\s\n]*\/\* ======= Formular-Elemente ======= \*\//, "} } /* ======= Formular-Elemente ======= */");

const regex2 = /@media \(prefers-color-scheme: dark\) \{/
const changes2 = `:root.theme-dark,
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {`

// we'll just implement the logic to append .theme-dark to dark mode logic if any
// but wait, is there a dark mode media query or is dark the default in :root? Let's check globals.css
fs.writeFileSync(file, content);
