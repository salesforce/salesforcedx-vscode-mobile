/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { workspace } from 'vscode';
import { access } from 'fs/promises';
import * as path from 'path';

export class WorkspaceUtils {
    static readonly STATIC_RESOURCES_PATH = path.join(
        'force-app',
        'main',
        'default',
        'staticresources'
    );

    static getWorkspaceDir(): string {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new NoWorkspaceError(
                'No workspace defined for this project.'
            );
        }
        return workspaceFolders[0].uri.fsPath;
    }

    static async getStaticResourcesDir(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let projectPath: string;
            try {
                projectPath = this.getWorkspaceDir();
            } catch (err) {
                return reject(err);
            }
            const staticResourcesPath = path.join(
                projectPath,
                this.STATIC_RESOURCES_PATH
            );
            try {
                await access(staticResourcesPath);
            } catch (err) {
                const noAccessError = new NoStaticResourcesDirError(
                    `Could not read static resources directory at '${staticResourcesPath}'`
                );

                return reject(noAccessError);
            }
            return resolve(staticResourcesPath);
        });
    }
}

export class NoWorkspaceError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, NoWorkspaceError.prototype);
    }
}

export class NoStaticResourcesDirError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, NoStaticResourcesDirError.prototype);
    }
}
