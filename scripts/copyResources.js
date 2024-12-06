const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'out', 'src', 'resources');
const sourceFile = path.join(projectRoot, 'resources', 'component-experiences.yaml');
const destFile = path.join(outDir, 'component-experiences.yaml');

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(sourceFile, destFile);
