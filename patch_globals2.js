const fs = require('fs');
const file = 'app/globals.css';
let content = fs.readFileSync(file, 'utf8');

// Undo bad replacement
content = content.replace(`:root.theme-light,
@media (prefers-color-scheme: light) {
  :root:not(.theme-dark) {
  :root {`, `:root.theme-light,
:root:not(.theme-dark) {
  @media (prefers-color-scheme: light) {`);

// Reset the file and manually edit it
fs.writeFileSync(file, content);
