/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Stats } from 'fs';
import { mkdtemp, rm, stat } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';

export class TempProjectDirManager {
    readonly projectDir: string;

    private constructor(projectDir: string) {
        this.projectDir = projectDir;
    }

    async removeDir(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let projectDirStats: Stats;
            try {
                projectDirStats = await stat(this.projectDir);
            } catch (err) {
                return reject(
                    `Project dir '${this.projectDir}' does not exist or is inaccessible.`
                );
            }
            if (!projectDirStats.isDirectory()) {
                return reject(
                    `Project dir '${this.projectDir}' is not a directory.`
                );
            }
            return rm(this.projectDir, { recursive: true, force: true });
        });
    }

    static async createTempProjectDir(): Promise<TempProjectDirManager> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectDir = await mkdtemp(
                    path.join(os.tmpdir(), 'offlineWizard-')
                );
                return resolve(new TempProjectDirManager(projectDir));
            } catch (err) {
                return reject(err);
            }
        });
    }
}

// Create a platform-agnostic absolute path to a non-existent folder.
export function createPlatformAbsolutePath(...pathArgs: string[]): string {
    const topLevel = path.parse(process.cwd()).root;
    return path.join(topLevel, ...pathArgs);
}
