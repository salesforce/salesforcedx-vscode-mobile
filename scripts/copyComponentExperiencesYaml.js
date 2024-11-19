const fs = require('fs');
const path = require('path');
const process = require('process');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'out', 'src', 'resources');
const sourceFile = path.join(projectRoot, 'resources', 'component-experiences.yaml');
const destFile = path.join(outDir, 'component-experiences.yaml');

fs.mkdirSync(outDir);

if (process.platform === 'win32') {    
    execSync(`copy "${sourceFile}" "${destFile}"`, { stdio: 'inherit', shell: 'cmd.exe' });
} else {
    execSync(`cp "${sourceFile}" "${destFile}"`, { stdio: 'inherit' });
}