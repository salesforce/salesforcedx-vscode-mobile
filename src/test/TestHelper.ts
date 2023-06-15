import { Stats } from 'fs';
import { mkdtemp, rm, stat } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';

export async function createTempProjectDir(): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            const projectDir = await mkdtemp(
                path.join(os.tmpdir(), 'offlineWizard-')
            );
            return resolve(projectDir);
        } catch (err) {
            return reject(err);
        }
    });
}

export async function removeTempProjectDir(projectDir: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        let projectDirStats: Stats;
        try {
            projectDirStats = await stat(projectDir);
        } catch (err) {
            return reject(
                `Project dir '${projectDir}' does not exist or is inaccessible.`
            );
        }
        if (!projectDirStats.isDirectory()) {
            return reject(`Project dir '${projectDir}' is not a directory.`);
        }
        return rm(projectDir, { recursive: true, force: true });
    });
}

// Create a platform-agnostic absolute path to a non-existent folder.
export function createNonExistentAbsolutePath(): string {
    const topLevel = path.parse(process.cwd()).root;
    return path.join(topLevel, 'starter-kit-tests', 'path', 'to', 'nowhere');
}
